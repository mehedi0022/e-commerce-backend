import { db } from "../../../prisma/db.js";
const fields = ["id", "productId", "userId", "orderItemId", "rating", "title", "comment", "status", "isVerifiedPurchase", "approvedAt", "rejectedAt", "moderatedById", "createdAt", "updatedAt"] as const;
const customer = (q: any) => q.select(...fields).include("product", (p: any) => p.select("id", "name", "slug")).include("user", (u: any) => u.select("id", "fullName", "userName")).include("orderItem", (o: any) => o.select("id", "orderId", "productName", "sku"));
const publicView = (q: any) => q.select("id", "rating", "title", "comment", "isVerifiedPurchase", "createdAt", "updatedAt").include("user", (u: any) => u.select("fullName", "userName"));
export const orderItem = (id: number) => db.orm.public.OrderItem.select("id", "orderId", "productId").include("order", (o: any) => o.select("id", "userId", "status")).first({ id });
export const find = (id: number) => customer(db.orm.public.ProductReview).first({ id });
export const findOwned = (id: number, userId: number) => customer(db.orm.public.ProductReview).first({ id, userId });
export const create = (tx: any, data: any) => tx.orm.public.ProductReview.select(...fields).create(data);
export const update = (tx: any, id: number, data: any) => tx.orm.public.ProductReview.where({ id }).select(...fields).update(data);
export const remove = (tx: any, id: number) => tx.orm.public.ProductReview.where({ id }).delete();
export const byProduct = async (slug: string, q: any) => {
  const prod = await db.orm.public.Product.select("id").first({ slug });
  if (!prod) return [];
  let x: any = publicView(db.orm.public.ProductReview).where({ status: "APPROVED", productId: prod.id });
  const order = q.sort === "oldest" ? (r: any) => r.createdAt.asc() : q.sort === "highest" ? (r: any) => r.rating.desc() : q.sort === "lowest" ? (r: any) => r.rating.asc() : (r: any) => r.createdAt.desc();
  return x.orderBy(order).offset((q.page - 1) * q.limit).limit(q.limit).all();
};
export const adminList = async (q: any) => {
  let filter: any = db.orm.public.ProductReview;
  if (q.status) filter = filter.where({ status: q.status });
  if (q.rating) filter = filter.where({ rating: q.rating });
  if (q.productId) filter = filter.where({ productId: q.productId });
  if (q.userId) filter = filter.where({ userId: q.userId });

  const page = q.page ? Number(q.page) : 1;
  const limit = q.limit ? Number(q.limit) : 20;

  const countPromise = filter.aggregate((a: any) => ({ total: a.count() }));
  const dataPromise = customer(filter)
    .orderBy((r: any) => r.createdAt.desc())
    .offset((page - 1) * limit)
    .limit(limit)
    .all();

  const [countRes, rows] = await Promise.all([countPromise, dataPromise]);
  return { rows, total: countRes?.total ?? rows.length };
};
export const mine = (userId: number) => customer(db.orm.public.ProductReview).where({ userId }).orderBy((r: any) => r.createdAt.desc()).all();
export const summary = async (slug: string) => {
  const prod = await db.orm.public.Product.select("id").first({ slug });
  if (!prod) return [];
  return db.orm.public.ProductReview.select("rating").where({ status: "APPROVED", productId: prod.id }).all();
};
