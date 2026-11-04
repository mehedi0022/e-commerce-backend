import { db } from "../../../prisma/db.js";
import { and, or } from "@prisma/orm-postgres/orm-client";
import type {
  CaptureIncompleteOrderInput,
  UpdateIncompleteOrderInput,
  IncompleteOrderQuery,
  IncompleteOrderMetrics,
} from "../incomplete-order.types.js";

const incompleteOrderFields = [
  "id",
  "sessionId",
  "customerName",
  "customerPhone",
  "customerEmail",
  "shippingAddress",
  "cartItems",
  "subtotal",
  "shippingFee",
  "totalAmount",
  "source",
  "status",
  "crmNotes",
  "convertedOrderId",
  "createdAt",
  "updatedAt",
] as const;

export const upsertCapture = async (data: CaptureIncompleteOrderInput) => {
  // Look for existing incomplete order for this browser session that hasn't been converted/cancelled
  const cleanPhone = data.customerPhone.trim();
  const existing = await db.orm.public.IncompleteOrder.select("id", "status")
    .where((io: any) =>
      or(
        io.sessionId.eq(data.sessionId),
        and(io.customerPhone.eq(cleanPhone), io.status.in(["PENDING", "CALLED_NO_RESPONSE"]))
      )
    )
    .first();

  const subtotalStr = String(data.subtotal ?? 0);
  const shippingFeeStr = String(data.shippingFee ?? 0);
  const totalAmountStr = String(data.totalAmount ?? 0);

  if (existing) {
    // If already converted, don't overwrite it
    if (existing.status === "CONVERTED") {
      return existing;
    }

    return db.orm.public.IncompleteOrder.where({ id: existing.id }).update({
      customerName: data.customerName ?? undefined,
      customerPhone: cleanPhone,
      customerEmail: data.customerEmail ?? undefined,
      shippingAddress: data.shippingAddress as any,
      cartItems: data.cartItems as any,
      subtotal: subtotalStr as any,
      shippingFee: shippingFeeStr as any,
      totalAmount: totalAmountStr as any,
      source: data.source ?? "CHECKOUT",
    });
  }

  return db.orm.public.IncompleteOrder.create({
    sessionId: data.sessionId,
    customerName: data.customerName ?? null,
    customerPhone: cleanPhone,
    customerEmail: data.customerEmail ?? null,
    shippingAddress: (data.shippingAddress ?? null) as any,
    cartItems: data.cartItems as any,
    subtotal: subtotalStr as any,
    shippingFee: shippingFeeStr as any,
    totalAmount: totalAmountStr as any,
    source: data.source ?? "CHECKOUT",
    status: "PENDING",
    crmNotes: null,
    convertedOrderId: null,
  } as any);
};

export const findAll = async (params: IncompleteOrderQuery) => {
  const { page = 1, limit = 20, status, search, source } = params;

  let q: any = db.orm.public.IncompleteOrder.select(...incompleteOrderFields)
    .include("convertedOrder", (o: any) =>
      o.select("id", "orderNumber", "status", "paymentStatus", "grandTotal")
    );

  if (status && status !== "ALL") {
    q = q.where({ status });
  }

  if (source) {
    q = q.where({ source });
  }

  if (search) {
    const s = search.toLowerCase().trim();
    q = q.where((io: any) =>
      or(io.customerPhone.ilike(`%${s}%`), io.customerName.ilike(`%${s}%`))
    );
  }

  const [{ total }, data] = await Promise.all([
    q.aggregate((a: any) => ({ total: a.count() })),
    q
      .orderBy((io: any) => io.createdAt.desc())
      .offset((page - 1) * limit)
      .limit(limit)
      .all(),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const findById = async (id: number) => {
  return db.orm.public.IncompleteOrder.select(...incompleteOrderFields)
    .include("convertedOrder", (o: any) =>
      o.select("id", "orderNumber", "status", "paymentStatus", "grandTotal")
    )
    .first({ id });
};

export const update = async (id: number, data: UpdateIncompleteOrderInput) => {
  const updateData: any = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.crmNotes !== undefined) updateData.crmNotes = data.crmNotes;

  return db.orm.public.IncompleteOrder.where({ id }).update(updateData);
};

export const markConverted = async (sessionId: string, phone: string, orderId: number) => {
  try {
    const cleanPhone = phone.trim();
    const existing = await db.orm.public.IncompleteOrder.select("id", "status")
      .where((io: any) =>
        or(
          io.sessionId.eq(sessionId),
          and(io.customerPhone.eq(cleanPhone), io.status.neq("CONVERTED"))
        )
      )
      .first();

    if (existing) {
      await db.orm.public.IncompleteOrder.where({ id: existing.id }).update({
        status: "CONVERTED",
        convertedOrderId: orderId,
      });
    }
  } catch {
    // Non-blocking
  }
};

export const getMetrics = async (): Promise<IncompleteOrderMetrics> => {
  const all = await db.orm.public.IncompleteOrder.select(
    "id",
    "status",
    "totalAmount"
  ).all();

  const totalLeads = all.length;
  let pendingCalls = 0;
  let contactedCount = 0;
  let convertedCount = 0;
  let potentialRevenueNum = 0;
  let recoveredRevenueNum = 0;

  const statusCounts: Record<string, number> = {
    PENDING: 0,
    CALLED_NO_RESPONSE: 0,
    CONTACTED: 0,
    CONVERTED: 0,
    CANCELLED: 0,
  };

  for (const item of all) {
    const amt = Number(item.totalAmount) || 0;
    if (item.status && statusCounts[item.status] !== undefined) {
      statusCounts[item.status]++;
    }
    if (item.status === "PENDING" || item.status === "CALLED_NO_RESPONSE") {
      pendingCalls++;
      potentialRevenueNum += amt;
    } else if (item.status === "CONTACTED") {
      contactedCount++;
      potentialRevenueNum += amt;
    } else if (item.status === "CONVERTED") {
      convertedCount++;
      recoveredRevenueNum += amt;
    }
  }

  const conversionRate = totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : "0.0";

  return {
    totalLeads,
    pendingCalls,
    contactedCount,
    convertedCount,
    statusCounts,
    potentialRevenue: potentialRevenueNum.toFixed(2),
    recoveredRevenue: recoveredRevenueNum.toFixed(2),
    conversionRate: `${conversionRate}%`,
  };
};
