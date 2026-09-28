import { db } from "../../../prisma/db.js";
import { ConflictError, NotFoundError } from "../../../errors/AppError.js";
import * as repo from "../repositories/wishlist.repository.js";
const duplicate = (e: any) => /unique|duplicate/i.test(String(e?.message));
export const add = async (userId: number, productId: number) => { const product: any = await repo.product(productId); if (!product) throw new NotFoundError("Product not found"); if (product.status !== "ACTIVE") throw new ConflictError("Product is not available for wishlist"); const existing = await repo.find(userId, productId); if (existing) return existing; try { return await db.transaction((tx) => repo.create(tx, { userId, productId })); } catch (e) { if (duplicate(e)) return repo.find(userId, productId); throw e; } };
export const list = async (userId: number, page: number, limit: number) => { const [items, all] = await Promise.all([repo.list(userId, page, limit), repo.count(userId)]); return { items, count: all.length, meta: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } }; };
export const remove = async (userId: number, productId: number) => { await db.transaction((tx) => repo.remove(tx, userId, productId)); };
