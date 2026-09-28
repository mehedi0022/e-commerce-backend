import { db } from "../../../prisma/db.js";
import type { MovementQuery } from "../inventory.types.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
const inventoryFields = ["id", "variantId", "quantity", "reservedQuantity", "lowStockThreshold", "createdAt", "updatedAt"] as const;
// Prisma 8 aggregate inference is widened through the dynamic query filters.
// The runtime returns a numeric count.
export const findVariant = (variantId: number) => db.orm.public.ProductVariant.select("id", "sku").first({ id: variantId });
export const find = (variantId: number) => db.orm.public.Inventory.select(...inventoryFields).first({ variantId });
export const create = (tx: any, variantId: number, quantity: number, lowStockThreshold: number) => tx.orm.public.Inventory.select(...inventoryFields).create({ variantId, quantity, reservedQuantity: 0, lowStockThreshold });
export const update = (tx: any, id: number, data: Record<string, unknown>) => tx.orm.public.Inventory.where({ id }).select(...inventoryFields).update(data);
export const movement = (tx: any, inventoryId: number, data: Record<string, unknown>) => tx.orm.public.InventoryMovement.create({ inventoryId, ...data });
export const movements = async (variantId: number, query: MovementQuery) => { const inventory = await find(variantId); if (!inventory) return null; let q = db.orm.public.InventoryMovement.select("id", "inventoryId", "type", "quantity", "referenceType", "referenceId", "note", "createdAt").where({ inventoryId: inventory.id }); if (query.type) q = q.where({ type: query.type }); if (query.referenceType) q = q.where({ referenceType: query.referenceType }); if (query.referenceId) q = q.where({ referenceId: query.referenceId }); const [{ total }, rows] = await Promise.all([q.aggregate((a: any) => ({ total: a.count() })), q.orderBy((m: any) => query.sortOrder === "asc" ? m.createdAt.asc() : m.createdAt.desc()).offset(pageOffset(Number(query.page), Number(query.limit))).limit(Number(query.limit)).all()]); return { rows, meta: paginationMeta(Number(query.page), Number(query.limit), Number(total)) }; };
