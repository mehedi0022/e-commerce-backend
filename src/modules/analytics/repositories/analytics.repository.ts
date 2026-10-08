import { db } from "../../../prisma/db.js";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { Temporal } from "temporal-polyfill";

export const getOrdersInDateRange = async (start: Temporal.Instant, end: Temporal.Instant) => {
  return db.orm.public.Order
    .select(
      "id",
      "orderNumber",
      "customerName",
      "customerPhone",
      "status",
      "paymentMethod",
      "paymentStatus",
      "grandTotal",
      "createdAt",
    )
    .include("items", (i: any) =>
      i.select("id", "productId", "variantId", "productName", "productSlug", "sku", "quantity", "unitPrice", "lineTotal"),
    )
    .where((o: any) => and(o.createdAt.gte(start), o.createdAt.lte(end)))
    .orderBy((o: any) => o.createdAt.asc())
    .all();
};

export const getRecentOrders = async (limitCount = 6) => {
  return db.orm.public.Order
    .select(
      "id",
      "orderNumber",
      "customerName",
      "customerPhone",
      "status",
      "paymentMethod",
      "paymentStatus",
      "grandTotal",
      "createdAt",
    )
    .include("items", (i: any) => i.select("id"))
    .orderBy((o: any) => o.createdAt.desc())
    .limit(limitCount)
    .all();
};

export const getCustomerCounts = async (
  currentStart: Temporal.Instant,
  currentEnd: Temporal.Instant,
  prevStart: Temporal.Instant,
  prevEnd: Temporal.Instant,
) => {
  // Count total registered users
  const totalCountPromise = db.orm.public.User.where({ isActive: true }).aggregate((a: any) => ({
    total: a.count(),
  }));

  // Count new users in current period
  const newCurrentPromise = db.orm.public.User
    .where((u: any) => and(u.createdAt.gte(currentStart), u.createdAt.lte(currentEnd)))
    .aggregate((a: any) => ({ count: a.count() }));

  // Count new users in previous period
  const newPrevPromise = db.orm.public.User
    .where((u: any) => and(u.createdAt.gte(prevStart), u.createdAt.lte(prevEnd)))
    .aggregate((a: any) => ({ count: a.count() }));

  const [totalRes, currentRes, prevRes] = await Promise.all([
    totalCountPromise,
    newCurrentPromise,
    newPrevPromise,
  ]);

  return {
    totalCustomers: Number(totalRes?.total ?? 0),
    newInPeriod: Number(currentRes?.count ?? 0),
    previousNew: Number(prevRes?.count ?? 0),
  };
};

export const getInventoryStatus = async () => {
  const variants = await db.orm.public.ProductVariant
    .select("id", "productId", "sku", "price", "isActive", "createdAt")
    .include("inventory", (i: any) =>
      i.select("id", "quantity", "reservedQuantity", "lowStockThreshold", "updatedAt"),
    )
    .include("product", (p: any) =>
      p.select("id", "name", "slug", "status")
        .include("images", (img: any) => img.select("id", "imageUrl", "isPrimary", "sortOrder")),
    )
    .all();

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let inStockCount = 0;
  let totalOnHand = 0;

  const lowStockItems: Array<{
    variantId: number;
    productId: number;
    productName: string;
    productSlug: string;
    productImage: string | null;
    sku: string;
    availableQuantity: number;
    lowStockThreshold: number;
    status: "LOW_STOCK" | "OUT_OF_STOCK";
  }> = [];

  for (const v of variants as any[]) {
    const qty = Number(v.inventory?.quantity ?? 0);
    const reserved = Number(v.inventory?.reservedQuantity ?? 0);
    const threshold = Number(v.inventory?.lowStockThreshold ?? 5);
    const available = qty - reserved;
    totalOnHand += qty;

    const primaryImg =
      v.product?.images?.find((img: any) => img.isPrimary)?.imageUrl ||
      v.product?.images?.[0]?.imageUrl ||
      null;

    if (available <= 0) {
      outOfStockCount++;
      lowStockItems.push({
        variantId: v.id,
        productId: v.productId,
        productName: v.product?.name || "Product",
        productSlug: v.product?.slug || "",
        productImage: primaryImg,
        sku: v.sku,
        availableQuantity: available,
        lowStockThreshold: threshold,
        status: "OUT_OF_STOCK",
      });
    } else if (available <= threshold) {
      lowStockCount++;
      lowStockItems.push({
        variantId: v.id,
        productId: v.productId,
        productName: v.product?.name || "Product",
        productSlug: v.product?.slug || "",
        productImage: primaryImg,
        sku: v.sku,
        availableQuantity: available,
        lowStockThreshold: threshold,
        status: "LOW_STOCK",
      });
    } else {
      inStockCount++;
    }
  }

  // Sort critical items (out of stock first, then lowest available)
  lowStockItems.sort((a, b) => a.availableQuantity - b.availableQuantity);

  return {
    summary: {
      lowStockCount,
      outOfStockCount,
      inStockCount,
      totalOnHand,
    },
    lowStockItems: lowStockItems.slice(0, 8),
  };
};

export const getReturnsAndRefunds = async () => {
  const pendingReturnsPromise = db.orm.public.Return
    .where({ status: "REQUESTED" })
    .aggregate((a: any) => ({ count: a.count() }));

  const completedRefundsPromise = db.orm.public.Refund
    .where({ status: "COMPLETED" })
    .select("amount")
    .all();

  const [returnsRes, refundsList] = await Promise.all([
    pendingReturnsPromise,
    completedRefundsPromise,
  ]);

  const totalRefunded = refundsList.reduce(
    (sum: number, r: any) => sum + Number(r.amount || 0),
    0,
  );

  return {
    pendingReturnsCount: Number(returnsRes?.count ?? 0),
    totalRefundedAmount: totalRefunded.toFixed(2),
  };
};

export const getTopSellingProducts = async (
  start: Temporal.Instant,
  end: Temporal.Instant,
  limitCount = 5,
) => {
  // Fetch non-cancelled orders in period
  const orders = await db.orm.public.Order
    .select("id", "status")
    .include("items", (i: any) =>
      i.select("id", "productId", "productName", "productSlug", "sku", "quantity", "lineTotal")
        .include("product", (p: any) =>
          p.select("id", "name", "slug")
            .include("images", (img: any) => img.select("id", "imageUrl", "isPrimary", "sortOrder")),
        ),
    )
    .where((o: any) => and(o.createdAt.gte(start), o.createdAt.lte(end)))
    .where((o: any) => o.status.neq("CANCELLED"))
    .all();

  const aggregated: Record<
    number,
    {
      productId: number;
      productName: string;
      productSlug: string;
      productImage: string | null;
      sku: string;
      unitsSold: number;
      revenue: number;
    }
  > = {};

  for (const order of orders as any[]) {
    for (const item of (order.items as any[]) || []) {
      const pid = item.productId || item.id;
      if (!aggregated[pid]) {
        const primaryImg =
          item.product?.images?.find((img: any) => img.isPrimary)?.imageUrl ||
          item.product?.images?.[0]?.imageUrl ||
          null;

        aggregated[pid] = {
          productId: pid,
          productName: item.productName,
          productSlug: item.productSlug || item.product?.slug || "",
          productImage: primaryImg,
          sku: item.sku,
          unitsSold: 0,
          revenue: 0,
        };
      }
      aggregated[pid].unitsSold += Number(item.quantity || 0);
      aggregated[pid].revenue += Number(item.lineTotal || 0);
    }
  }

  const list = Object.values(aggregated).sort((a, b) => b.unitsSold - a.unitsSold);

  return list.slice(0, limitCount).map((p) => ({
    ...p,
    revenue: p.revenue.toFixed(2),
  }));
};
