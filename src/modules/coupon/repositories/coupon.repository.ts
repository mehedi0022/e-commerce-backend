import { db } from "../../../prisma/db.js";
const fields = ["id", "code", "name", "description", "discountType", "discountValue", "minimumOrderAmount", "maximumDiscountAmount", "usageLimit", "usageLimitPerUser", "startsAt", "expiresAt", "isActive", "createdAt", "updatedAt"] as const;
export const findByCode = (code: string) => db.orm.public.Coupon.select(...fields).first({ code });
export const findByCodeInTransaction = (tx: any, code: string) => tx.orm.public.Coupon.select(...fields).first({ code });
export const findByIdInTransaction = (tx: any, id: number) => tx.orm.public.Coupon.select(...fields).first({ id });
export const find = (id: number) => db.orm.public.Coupon.select(...fields).first({ id });
export const create = (data: any) => db.orm.public.Coupon.select(...fields).create(data);
export const update = (id: number, data: any) => db.orm.public.Coupon.where({ id }).select(...fields).update(data);
export const remove = (id: number) => db.orm.public.Coupon.where({ id }).delete();
export const usages = (couponId: number) => db.orm.public.CouponUsage.select("id", "userId", "orderId", "usedAt").where({ couponId }).all();
export const usageCount = (tx: any, couponId: number, userId?: number) => {
  let query: any = tx.orm.public.CouponUsage.where({ couponId });
  if (userId !== undefined) query = query.where({ userId });
  return query.aggregate((a: any) => ({ total: a.count() }));
};
export const lockCouponForCheckout = async (tx: any, couponId: number) => {
  const plan = db.raw.sql`SELECT "id" FROM "public"."coupon" WHERE "id" = ${couponId} FOR UPDATE`
    .returnsRow({ id: db.sql.public.coupon.columns.id })
    .build();
  const rows = await tx.query(plan);
  return rows[0] ?? null;
};
export const createUsage = (tx: any, data: any) => tx.orm.public.CouponUsage.create(data);
export const list = async (q: any) => { let query: any = db.orm.public.Coupon.select(...fields); if (q.discountType) query = query.where({ discountType: q.discountType }); if (q.isActive !== undefined) query = query.where({ isActive: q.isActive }); const rows = await query.orderBy((x: any) => x.createdAt.desc()).offset((q.page - 1) * q.limit).limit(q.limit).all(); return rows; };
