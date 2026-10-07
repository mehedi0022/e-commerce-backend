import { db } from "../../../prisma/db.js";
import { or } from "@prisma/orm-postgres/orm-client";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";

const toTimestamp = (val: any): number => {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val.epochMilliseconds === "number") return val.epochMilliseconds;
  if (val instanceof Date) return val.getTime();
  if (typeof val.toString === "function") {
    const str = val.toString();
    const t = new Date(str).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
};

const toIsoString = (val: any): string | null => {
  if (!val) return null;
  if (typeof val.toString === "function") return val.toString();
  return String(val);
};

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  sortBy?: "createdAt" | "totalSpent" | "totalOrders" | "fullName";
  sortOrder?: "asc" | "desc";
}

export const listCustomers = async (query: CustomerListQuery) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 15));
  const search = query.search?.trim();
  const status = query.status;
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";

  // Find the CUSTOMER role
  const customerRole = await db.orm.public.Role.select("id", "key", "name").first({ key: "CUSTOMER" });

  // Get all users who have the CUSTOMER role (or all users if customer role not specifically configured)
  let userQuery: any = db.orm.public.User
    .select("id", "phone", "email", "userName", "fullName", "roleId", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
    .include("rbacRole", (r: any) => r.select("id", "key", "name", "rank"));

  if (customerRole) {
    userQuery = userQuery.where({ roleId: customerRole.id });
  }

  if (status && status !== "ALL") {
    userQuery = userQuery.where({ isActive: status === "ACTIVE" });
  }

  if (search) {
    const term = `%${search}%`;
    userQuery = userQuery.where((u: any) =>
      or(
        u.fullName.ilike(term),
        u.userName.ilike(term),
        u.email.ilike(term),
        u.phone.ilike(term),
      ),
    );
  }

  const allFilteredUsers = await userQuery.orderBy((u: any) => u.createdAt.desc()).all();

  // Fetch all orders with user info to aggregate metrics
  const allOrders = await db.orm.public.Order
    .select("id", "userId", "customerEmail", "customerPhone", "grandTotal", "status", "paymentStatus", "placedAt", "createdAt")
    .all();

  // Fetch saved addresses to resolve phone numbers
  const allAddresses = await db.orm.public.Address
    .select("id", "userId", "phone", "district", "addressLine1")
    .all();

  // Map orders by userId and customerEmail
  const ordersByUserId = new Map<number, any[]>();
  const ordersByEmail = new Map<string, any[]>();
  const phoneByUserId = new Map<number, string>();

  for (const addr of allAddresses) {
    if (addr.userId && addr.phone && !phoneByUserId.has(addr.userId)) {
      phoneByUserId.set(addr.userId, addr.phone);
    }
  }

  for (const ord of allOrders) {
    if (ord.userId) {
      if (!ordersByUserId.has(ord.userId)) ordersByUserId.set(ord.userId, []);
      ordersByUserId.get(ord.userId)!.push(ord);
      if (ord.customerPhone && !phoneByUserId.has(ord.userId)) {
        phoneByUserId.set(ord.userId, ord.customerPhone);
      }
    }
    if (ord.customerEmail) {
      const emailLower = ord.customerEmail.toLowerCase();
      if (!ordersByEmail.has(emailLower)) ordersByEmail.set(emailLower, []);
      ordersByEmail.get(emailLower)!.push(ord);
    }
  }

  // Enrich customer records with order aggregates
  let mappedCustomers = allFilteredUsers.map((u: any) => {
    const userOrders = ordersByUserId.get(u.id) || ordersByEmail.get(u.email?.toLowerCase()) || [];
    const validOrders = userOrders.filter((o: any) => o.status !== "CANCELLED");

    const totalOrders = userOrders.length;
    const totalSpent = validOrders.reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);

    const sortedOrders = [...userOrders].sort(
      (a: any, b: any) =>
        toTimestamp(b.placedAt || b.createdAt) - toTimestamp(a.placedAt || a.createdAt)
    );
    const lastOrderDate = sortedOrders[0] ? toIsoString(sortedOrders[0].placedAt || sortedOrders[0].createdAt) : null;
    const phone = u.phone || phoneByUserId.get(u.id) || sortedOrders[0]?.customerPhone || null;

    return {
      id: u.id,
      fullName: u.fullName || u.userName || "Customer",
      userName: u.userName,
      email: u.email,
      phone,
      isActive: Boolean(u.isActive),
      emailVerifiedAt: toIsoString(u.emailVerifiedAt),
      role: {
        id: u.rbacRole?.id || u.roleId,
        key: u.rbacRole?.key || "CUSTOMER",
        name: u.rbacRole?.name || "Customer",
      },
      totalOrders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      lastOrderDate,
      createdAt: toIsoString(u.createdAt) || "",
      updatedAt: toIsoString(u.updatedAt) || "",
    };
  });

  // Filter by phone search if search is phone number
  if (search && /^\+?[0-9\s-]+$/.test(search)) {
    const term = search.replace(/[\s-]/g, "");
    mappedCustomers = mappedCustomers.filter((c: any) => c.phone && c.phone.replace(/[\s-]/g, "").includes(term));
  }

  // Summary statistics across all customers
  const totalCustomers = mappedCustomers.length;
  const activeCustomers = mappedCustomers.filter((c: any) => c.isActive).length;
  const inactiveCustomers = totalCustomers - activeCustomers;
  const totalOrdersCount = mappedCustomers.reduce((sum: number, c: any) => sum + c.totalOrders, 0);
  const totalRevenue = mappedCustomers.reduce((sum: number, c: any) => sum + c.totalSpent, 0);

  // Sorting
  mappedCustomers.sort((a: any, b: any) => {
    let comp = 0;
    if (sortBy === "totalSpent") {
      comp = a.totalSpent - b.totalSpent;
    } else if (sortBy === "totalOrders") {
      comp = a.totalOrders - b.totalOrders;
    } else if (sortBy === "fullName") {
      comp = a.fullName.localeCompare(b.fullName);
    } else {
      comp = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
    }
    return sortOrder === "asc" ? comp : -comp;
  });

  // Pagination slice
  const offset = pageOffset(page, limit);
  const paginatedItems = mappedCustomers.slice(offset, offset + limit);

  return {
    items: paginatedItems,
    summary: {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      totalOrders: totalOrdersCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageOrderValue: totalOrdersCount > 0 ? Math.round((totalRevenue / totalOrdersCount) * 100) / 100 : 0,
    },
    pagination: paginationMeta(page, limit, totalCustomers),
  };
};

export const getCustomerDetail = async (id: number) => {
  const user = await db.orm.public.User
    .select("id", "phone", "email", "userName", "fullName", "roleId", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
    .include("rbacRole", (r: any) => r.select("id", "key", "name", "rank"))
    .first({ id });

  if (!user) return null;
  const userAny = user as any;

  // Fetch all orders for this user
  const orders = await db.orm.public.Order
    .select("id", "orderNumber", "grandTotal", "status", "paymentStatus", "placedAt", "createdAt", "customerPhone", "customerName", "shippingCharge")
    .include("items", (i: any) => i.select("id", "productName", "quantity", "unitPrice", "lineTotal"))
    .where((o: any) =>
      userAny.email
        ? or(o.userId.eq(userAny.id), o.customerEmail.eq(userAny.email))
        : o.userId.eq(userAny.id)
    )
    .orderBy((o: any) => o.createdAt.desc())
    .all();

  // Fetch saved addresses
  const addresses = await db.orm.public.Address
    .select(
      "id",
      "label",
      "fullName",
      "phone",
      "addressLine1",
      "addressLine2",
      "division",
      "district",
      "upazila",
      "thana",
      "postalCode",
      "isDefaultShipping",
      "isDefaultBilling",
      "createdAt",
    )
    .where({ userId: userAny.id })
    .orderBy((a: any) => a.createdAt.desc())
    .all();

  const validOrders = orders.filter((o) => o.status !== "CANCELLED");
  const totalOrders = orders.length;
  const totalSpent = validOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
  const pendingOrders = orders.filter((o) => ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"].includes(o.status)).length;

  const phone = userAny.phone || addresses[0]?.phone || orders[0]?.customerPhone || null;

  return {
    customer: {
      id: userAny.id,
      fullName: userAny.fullName || userAny.userName || "Customer",
      userName: userAny.userName,
      email: userAny.email,
      phone,
      isActive: Boolean(userAny.isActive),
      emailVerifiedAt: toIsoString(userAny.emailVerifiedAt),
      role: {
        id: userAny.rbacRole?.id || userAny.roleId,
        key: userAny.rbacRole?.key || "CUSTOMER",
        name: userAny.rbacRole?.name || "Customer",
      },
      createdAt: toIsoString(userAny.createdAt) || "",
      updatedAt: toIsoString(userAny.updatedAt) || "",
    },
    metrics: {
      totalOrders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      averageOrderValue: validOrders.length > 0 ? Math.round((totalSpent / validOrders.length) * 100) / 100 : 0,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
    },
    recentOrders: orders.slice(0, 20).map((o: any) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      placedAt: toIsoString(o.placedAt || o.createdAt) || "",
      grandTotal: Number(o.grandTotal),
      status: o.status,
      paymentStatus: o.paymentStatus,
      itemsCount: o.items?.length || 0,
      items: (o.items || []).map((it: any) => ({
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
      })),
    })),
    addresses: addresses.map((a) => ({
      id: a.id,
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2,
      division: a.division,
      district: a.district,
      upazila: a.upazila,
      thana: a.thana,
      postalCode: a.postalCode,
      isDefaultShipping: Boolean(a.isDefaultShipping),
      isDefaultBilling: Boolean(a.isDefaultBilling),
    })),
  };
};

export const findCustomerUserById = async (id: number) => {
  return db.orm.public.User.select("id", "email", "isActive", "roleId").first({ id });
};

export const updateCustomerStatus = async (id: number, isActive: boolean) => {
  const updated = await db.orm.public.User
    .where({ id })
    .select("id", "email", "fullName", "isActive")
    .update({ isActive });

  return updated;
};
