import { db } from "../../../prisma/db.js";
import * as repo from "../repositories/inventory.repository.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../errors/AppError.js";
import type {
  AdjustmentInput,
  InitializeInput,
  MovementQuery,
  QuantityInput,
} from "../inventory.types.js";
const getVariant = async (id: number) => {
  const v = await repo.findVariant(id);
  if (!v) throw new NotFoundError("Product variant not found");
  return v;
};
const view = (x: any) => ({
  ...x,
  availableQuantity: x.quantity - x.reservedQuantity,
  isOutOfStock: x.quantity - x.reservedQuantity <= 0,
  isLowStock:
    x.quantity - x.reservedQuantity > 0 &&
    x.quantity - x.reservedQuantity <= x.lowStockThreshold,
});
export const get = async (variantId: number) => {
  await getVariant(variantId);
  const x = await repo.find(variantId);
  if (!x) throw new NotFoundError("Inventory is not initialized");
  return view(x);
};
export const initialize = async (variantId: number, data: InitializeInput) => {
  await getVariant(variantId);
  if (await repo.find(variantId))
    throw new ConflictError("Inventory is already initialized");
  return db.transaction(async (tx) => {
    const x = await repo.create(
      tx,
      variantId,
      data.quantity,
      data.lowStockThreshold,
    );
    if (data.quantity > 0)
      await repo.movement(tx, x.id, {
        type: "INITIAL_STOCK",
        quantity: data.quantity,
        note: data.note ?? null,
      });
    return view(x);
  });
};
const requireInventory = async (variantId: number) => {
  await getVariant(variantId);
  let x = await repo.find(variantId);
  if (!x) {
    x = await db.orm.public.Inventory.create({
      variantId,
      quantity: 0,
      reservedQuantity: 0,
      lowStockThreshold: 5,
    });
  }
  return x;
};

export const list = async (query: any) => {
  return repo.listInventory(query);
};

export const globalHistory = async (query: any) => {
  return repo.listGlobalMovements(query);
};

export const updateThreshold = async (
  variantId: number,
  data: { lowStockThreshold: number },
) => {
  await getVariant(variantId);
  const updated = await repo.updateThreshold(variantId, data.lowStockThreshold);
  return view(updated);
};
export const restock = async (variantId: number, data: QuantityInput) => {
  const x = await restockStock(variantId, data.quantity, undefined, { movementType: "RESTOCK", note: data.note ?? undefined, referenceType: data.referenceType ?? undefined, referenceId: data.referenceId ?? undefined });
  return view(x);
};
export const damage = async (variantId: number, data: QuantityInput) => {
  const x = await requireInventory(variantId);
  if (x.quantity - data.quantity < x.reservedQuantity)
    throw new ConflictError("Damage exceeds available stock");
  return db.transaction(async (tx) => {
    const updated = await repo.update(tx, x.id, {
      quantity: x.quantity - data.quantity,
    });
    await repo.movement(tx, x.id, {
      type: "DAMAGED",
      quantity: -data.quantity,
      note: data.note ?? null,
      referenceType: data.referenceType ?? null,
      referenceId: data.referenceId ?? null,
    });
    return view(updated);
  });
};
export const adjust = async (variantId: number, data: AdjustmentInput) => {
  const x = await requireInventory(variantId);
  if (x.quantity + data.quantity < x.reservedQuantity)
    throw new ConflictError("Adjustment would violate reserved stock");
  return db.transaction(async (tx) => {
    const updated = await repo.update(tx, x.id, {
      quantity: x.quantity + data.quantity,
    });
    await repo.movement(tx, x.id, {
      type: "ADJUSTMENT",
      quantity: data.quantity,
      note: data.note,
      referenceType: data.referenceType ?? null,
      referenceId: data.referenceId ?? null,
    });
    return view(updated);
  });
};
export const history = async (variantId: number, query: MovementQuery) => {
  await getVariant(variantId);
  const result = await repo.movements(variantId, query);
  if (!result) throw new NotFoundError("Inventory is not initialized");
  return result;
};
export const reserveStock = async (variantId: number, quantity: number, tx?: any) => {
  if (quantity <= 0)
    throw new ValidationError("Reservation quantity must be positive");
  const x = await requireInventory(variantId);
  const execute = async (client: any) => { const updated = await repo.reserveIfAvailable(client, x.id, quantity); if (!updated) throw new ConflictError("Insufficient available stock"); return updated; };
  return tx ? execute(tx) : db.transaction(execute);
};
export const releaseStock = async (variantId: number, quantity: number, tx?: any, reference?: { referenceType?: string; referenceId?: string }) => {
  if (quantity <= 0)
    throw new ValidationError("Release quantity must be positive");
  const x = await requireInventory(variantId);
  const execute = async (client: any) => { const updated = await repo.releaseIfReserved(client, x.id, quantity); if (!updated) throw new ConflictError("Cannot release more than reserved stock"); if (reference) await repo.movement(client, x.id, { type: "ORDER_CANCELLED", quantity: 0, referenceType: reference.referenceType ?? null, referenceId: reference.referenceId ?? null }); return updated; };
  return tx ? execute(tx) : db.transaction(execute);
};
export const commitReservedStock = async (
  variantId: number,
  quantity: number,
  reference?: { referenceType?: string; referenceId?: string },
  tx?: any,
) => {
  if (quantity <= 0)
    throw new ValidationError("Commit quantity must be positive");
  const x = await requireInventory(variantId);
  const execute = async (client: any) => {
    const updated = await repo.commitIfReserved(client, x.id, quantity);
    if (!updated) throw new ConflictError("Cannot commit more than reserved stock");
    await repo.movement(client, x.id, {
      type: "ORDER",
      quantity: -quantity,
      referenceType: reference?.referenceType ?? null,
      referenceId: reference?.referenceId ?? null,
    });
    return updated;
  };
  return tx ? execute(tx) : db.transaction(execute);
};
export const restockStock = async (variantId: number, quantity: number, tx?: any, reference?: { referenceType?: string; referenceId?: string; note?: string; movementType?: "RESTOCK" | "RETURN" }) => {
  if (quantity <= 0) throw new ValidationError("Restock quantity must be positive");
  const x = await requireInventory(variantId);
  const execute = async (client: any) => { const updated = await repo.restockAtomic(client, x.id, quantity); if (!updated) throw new NotFoundError("Inventory is not initialized"); await repo.movement(client, x.id, { type: reference?.movementType ?? "RETURN", quantity, referenceType: reference?.referenceType ?? null, referenceId: reference?.referenceId ?? null, note: reference?.note ?? null }); return updated; };
  return tx ? execute(tx) : db.transaction(execute);
};
