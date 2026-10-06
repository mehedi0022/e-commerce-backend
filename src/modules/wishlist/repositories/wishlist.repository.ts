import { db } from "../../../prisma/db.js";
const fields = ["id", "userId", "productId", "createdAt"] as const;
const withProduct = (q: any) => q.select(...fields).include("product", (p: any) => p.select("id", "name", "slug", "status", "brandId").include("brand", (b: any) => b.select("id", "name", "slug")).include("variants", (v: any) => v.select("id", "price", "compareAtPrice", "isActive").where({ isActive: true }).orderBy((x: any) => x.price.asc()).limit(1)).include("images", (i: any) => i.select("id", "imageUrl", "isPrimary", "sortOrder").orderBy((x: any) => x.sortOrder.asc()).limit(1)));
export const product = (id: number) => db.orm.public.Product.select("id", "name", "slug", "status").first({ id });
export const find = (userId: number, productId: number) => db.orm.public.WishlistItem.select(...fields).first({ userId, productId });
export const create = (tx: any, data: any) => tx.orm.public.WishlistItem.select(...fields).create(data);
export const remove = (tx: any, userId: number, productId: number) => tx.orm.public.WishlistItem.where({ userId, productId }).delete();
export const list = (userId: number, page: number, limit: number) => withProduct(db.orm.public.WishlistItem).where({ userId }).orderBy((x: any) => x.createdAt.desc()).offset((page - 1) * limit).limit(limit).all();
export const count = (userId: number) => db.orm.public.WishlistItem.select("id").where({ userId }).all();
