import { randomBytes } from "node:crypto";
import { Temporal } from "temporal-polyfill";
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

export const recordDamagedAuditMovement = async (
  variantId: number,
  params: {
    referenceType?: string;
    referenceId?: string;
    note?: string;
  },
  tx?: any,
) => {
  const x = await requireInventory(variantId);
  const execute = async (client: any) => {
    return repo.movement(client, x.id, {
      type: "DAMAGED",
      quantity: 0,
      note: params.note ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
    });
  };
  return tx ? execute(tx) : db.transaction(execute);
};

export const isOrderStockCommitted = async (
  orderNumber: string,
  tx?: any,
): Promise<boolean> => {
  const client = tx || db;
  const existing = await client.orm.public.InventoryMovement.first({
    referenceType: "ORDER",
    referenceId: orderNumber,
  });
  return Boolean(existing);
};

export const ensureOrderStockCommitted = async (
  orderId: number,
  orderNumber: string,
  tx?: any,
) => {
  const execute = async (client: any) => {
    // Idempotent: check if stock was already committed for this order
    const alreadyCommitted = await client.orm.public.InventoryMovement.first({
      referenceType: "ORDER",
      referenceId: orderNumber,
    });
    if (alreadyCommitted) {
      return;
    }

    const items: any[] = await client.orm.public.OrderItem.select(
      "id",
      "variantId",
      "quantity",
    )
      .where({ orderId })
      .all();

    items.sort(
      (a, b) =>
        (a.variantId ?? Number.MAX_SAFE_INTEGER) -
        (b.variantId ?? Number.MAX_SAFE_INTEGER),
    );

    for (const item of items) {
      if (!item.variantId) continue;
      await commitReservedStock(
        item.variantId,
        item.quantity,
        { referenceType: "ORDER", referenceId: orderNumber },
        client,
      );
    }
  };

  return tx ? execute(tx) : db.transaction(execute);
};

export const createReturnForOrder = async (
  orderId: number,
  orderNumber: string,
  tx?: any,
  options?: { note?: string; changedById?: number },
) => {
  const execute = async (client: any) => {
    const existing = await client.orm.public.Return.first({ orderId });
    if (existing) {
      return existing;
    }

    const order = await client.orm.public.Order.first({ id: orderId });
    if (!order) return null;

    const items: any[] = await client.orm.public.OrderItem.where({ orderId }).all();
    if (!items.length) return null;

    const now = Temporal.Now.instant();
    const retNum = `RET-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;

    const createdReturn = await client.orm.public.Return.create({
      returnNumber: retNum,
      orderId: order.id,
      userId: order.userId || null,
      status: "RECEIVED",
      customerNote: null,
      adminNote: options?.note || "Automated return record awaiting physical inspection",
      receivedAt: now,
    });

    for (const item of items) {
      await client.orm.public.ReturnItem.create({
        returnId: createdReturn.id,
        orderItemId: item.id,
        quantity: item.quantity,
        reason: "OTHER",
        customerNote: null,
        adminNote: null,
        restockStatus: "PENDING",
        restockQuantity: 0,
      });
    }

    await client.orm.public.ReturnStatusHistory.create({
      returnId: createdReturn.id,
      fromStatus: null,
      toStatus: "RECEIVED",
      note: options?.note || "Awaiting physical inspection",
      changedById: options?.changedById ?? null,
    });

    return createdReturn;
  };

  return tx ? execute(tx) : db.transaction(execute);
};

