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
export const reserveIfAvailable = (tx: any, id: number, quantity: number) => tx.orm.public.Inventory.where({ id }).where((i: any) => i.quantity.sub(i.reservedQuantity).gte(quantity)).select(...inventoryFields).update({ reservedQuantity: (x: any) => x.reservedQuantity.add(quantity) });
export const releaseIfReserved = (tx: any, id: number, quantity: number) => tx.orm.public.Inventory.where({ id }).where((i: any) => i.reservedQuantity.gte(quantity)).select(...inventoryFields).update({ reservedQuantity: (x: any) => x.reservedQuantity.sub(quantity) });
export const commitIfReserved = async (tx: any, id: number, quantity: number) => {
  const current: any = await tx.orm.public.Inventory.select(...inventoryFields).first({ id });
  if (!current || current.quantity < quantity || current.reservedQuantity < quantity) return null;
  return tx.orm.public.Inventory.where({ id }).where({ reservedQuantity: current.reservedQuantity }).select(...inventoryFields).update({ quantity: current.quantity - quantity, reservedQuantity: current.reservedQuantity - quantity });
};
export const restockAtomic = async (tx: any, id: number, quantity: number) => {
  const current: any = await tx.orm.public.Inventory.select(...inventoryFields).first({ id });
  if (!current) return null;
  return tx.orm.public.Inventory.where({ id }).select(...inventoryFields).update({ quantity: current.quantity + quantity });
};
export const adjustQuantity = (tx: any, id: number, delta: number, reserved: number) => tx.orm.public.Inventory.where({ id }).where((i: any) => delta >= 0 ? i.quantity.add(delta).gte(i.reservedQuantity) : i.quantity.gte(-delta), (i: any) => delta >= 0 ? i.quantity.gte(0) : i.quantity.sub(-delta).gte(i.reservedQuantity)).select(...inventoryFields).update({ quantity: (x: any) => delta >= 0 ? x.quantity.add(delta) : x.quantity.sub(-delta) });
export const movement = (tx: any, inventoryId: number, data: Record<string, unknown>) => tx.orm.public.InventoryMovement.create({ inventoryId, ...data });
export const movements = async (variantId: number, query: MovementQuery) => { const inventory = await find(variantId); if (!inventory) return null; let q = db.orm.public.InventoryMovement.select("id", "inventoryId", "type", "quantity", "referenceType", "referenceId", "note", "createdAt").where({ inventoryId: inventory.id }); if (query.type) q = q.where({ type: query.type }); if (query.referenceType) q = q.where({ referenceType: query.referenceType }); if (query.referenceId) q = q.where({ referenceId: query.referenceId }); const [{ total }, rows] = await Promise.all([q.aggregate((a: any) => ({ total: a.count() })), q.orderBy((m: any) => query.sortOrder === "asc" ? m.createdAt.asc() : m.createdAt.desc()).offset(pageOffset(Number(query.page), Number(query.limit))).limit(Number(query.limit)).all()]); return { rows, meta: paginationMeta(Number(query.page), Number(query.limit), Number(total)) }; };
