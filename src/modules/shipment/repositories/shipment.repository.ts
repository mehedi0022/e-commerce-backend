import { db } from "../../../prisma/db.js";
const fields = ["id", "orderId", "status", "courierName", "trackingNumber", "trackingUrl", "note", "readyAt", "shippedAt", "deliveredAt", "failedAt", "returnedAt", "cancelledAt", "createdAt", "updatedAt"] as const;
const detail = (q: any) => q.select(...fields).include("order", (o: any) => o.select("id", "orderNumber", "status")).include("statusHistory", (h: any) => h.select("id", "fromStatus", "toStatus", "note", "changedById", "createdAt").orderBy((x: any) => x.createdAt.asc()));
export const findByOrder = (orderId: number) => detail(db.orm.public.Shipment).first({ orderId });
export const findByOrderNumber = async (number: string) => {
  const order: any = await db.orm.public.Order.select("id").first({ orderNumber: number });
  return order ? detail(db.orm.public.Shipment).first({ orderId: order.id }) : null;
};
export const create = (tx: any, data: any) => tx.orm.public.Shipment.select(...fields).create(data);
export const update = (tx: any, id: number, data: any) => tx.orm.public.Shipment.where({ id }).select(...fields).update(data);
export const claimReadyToShip = (tx: any, id: number, data: any) => tx.orm.public.Shipment.where({ id, status: "READY_TO_SHIP" }).select(...fields).update(data);
export const history = (tx: any, data: any) => tx.orm.public.ShipmentStatusHistory.create(data);
export const list = (q: any) => { let x: any = db.orm.public.Shipment.select(...fields).include("order", (o: any) => o.select("orderNumber", "status")); if (q.status) x = x.where({ status: q.status }); if (q.courierName) x = x.where({ courierName: q.courierName }); if (q.trackingNumber) x = x.where({ trackingNumber: q.trackingNumber }); return x.orderBy((s: any) => s.createdAt.desc()).offset((q.page - 1) * q.limit).limit(q.limit).all(); };
