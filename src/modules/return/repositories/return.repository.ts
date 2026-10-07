import { db } from "../../../prisma/db.js";
const fields = ["id", "returnNumber", "orderId", "userId", "status", "customerNote", "adminNote", "requestedAt", "approvedAt", "rejectedAt", "receivedAt", "completedAt", "cancelledAt", "createdAt", "updatedAt"] as const;
const detail = (q: any) => q.select(...fields).include("order", (o: any) => o.select("id", "orderNumber", "customerName", "customerPhone", "customerEmail", "grandTotal", "paymentMethod")).include("refunds", (r: any) => r.select("id", "refundNumber", "amount", "status", "method", "createdAt")).include("items", (i: any) => i.select("id", "orderItemId", "quantity", "reason", "customerNote", "adminNote", "condition", "restockStatus", "restockQuantity").include("orderItem", (o: any) => o.select("id", "productName", "sku", "unitPrice", "quantity", "variantId").include("product", (p: any) => p.select("id", "name").include("images", (img: any) => img.select("id", "imageUrl", "isPrimary", "sortOrder").orderBy((x: any) => x.sortOrder.asc()))))).include("statusHistory", (h: any) => h.select("id", "fromStatus", "toStatus", "note", "changedById", "createdAt").orderBy((x: any) => x.createdAt.asc()));
export const findByNumber = (number: string) => detail(db.orm.public.Return).first({ returnNumber: number });
export const findOwned = (number: string, userId: number) => detail(db.orm.public.Return).first({ returnNumber: number, userId });
export const create = (tx: any, data: any) => tx.orm.public.Return.select(...fields).create(data);
export const item = (tx: any, data: any) => tx.orm.public.ReturnItem.create(data);
export const history = (tx: any, data: any) => tx.orm.public.ReturnStatusHistory.create(data);
export const update = (tx: any, id: number, data: any) => tx.orm.public.Return.where({ id }).select(...fields).update(data);
export const finalizeItemIfPending = (tx: any, id: number, data: any) => tx.orm.public.ReturnItem.where({ id, restockStatus: "PENDING" }).select("id", "condition", "restockStatus", "restockQuantity").update(data);
export const order = (number: string, userId?: number) => db.orm.public.Order.select("id", "orderNumber", "status", "userId", "deliveredAt", "subtotal", "discountAmount").first(userId === undefined ? { orderNumber: number } : { orderNumber: number, userId });
export const orderItems = (orderId: number) => db.orm.public.OrderItem.select("id", "orderId", "variantId", "quantity", "unitPrice", "lineTotal", "productName", "sku").where({ orderId }).all();
export const returnItems = (orderItemId: number) => db.orm.public.ReturnItem.select("quantity").include("return", (r: any) => r.select("status")).where({ orderItemId }).all();
export const lockOrderItemsForReturn = async (tx: any, orderId: number, orderItemIds: number[]) => {
  const rows: any[] = [];
  for (const orderItemId of [...orderItemIds].sort((a, b) => a - b)) {
    const plan = db.raw.sql`SELECT "id", "orderId", "variantId", "quantity", "unitPrice", "lineTotal", "productName", "sku"
      FROM "public"."order_item"
      WHERE "id" = ${orderItemId} AND "orderId" = ${orderId}
      FOR UPDATE`
      .returnsRow({
        id: db.sql.public.order_item.columns.id,
        orderId: db.sql.public.order_item.columns.orderId,
        variantId: db.sql.public.order_item.columns.variantId,
        quantity: db.sql.public.order_item.columns.quantity,
        unitPrice: db.sql.public.order_item.columns.unitPrice,
        lineTotal: db.sql.public.order_item.columns.lineTotal,
        productName: db.sql.public.order_item.columns.productName,
        sku: db.sql.public.order_item.columns.sku,
      })
      .build();
    const locked = await tx.query(plan);
    rows.push(...locked);
  }
  return rows;
};
export const lockReturnForRefund = async (tx: any, returnId: number) => {
  const plan = db.raw.sql`SELECT "id" FROM "public"."return" WHERE "id" = ${returnId} FOR UPDATE`
    .returnsRow({ id: db.sql.public.return.columns.id })
    .build();
  const rows = await tx.query(plan);
  return rows[0] ?? null;
};
export const findForRefund = (tx: any, returnId: number) => tx.orm.public.Return.select("id", "orderId", "status").include("items", (i: any) => i.select("quantity").include("orderItem", (o: any) => o.select("unitPrice"))).first({ id: returnId });
export const returnItemsForUpdate = (tx: any, orderItemId: number) => tx.orm.public.ReturnItem.select("quantity").include("return", (r: any) => r.select("status")).where({ orderItemId }).all();
export const list = (q: any, userId?: number) => { let x: any = detail(db.orm.public.Return); if (userId) x = x.where({ userId }); if (q.status) x = x.where({ status: q.status }); return x.orderBy((r: any) => r.createdAt.desc()).offset((q.page - 1) * q.limit).limit(q.limit).all(); };
