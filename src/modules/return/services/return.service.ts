import { randomBytes } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import { config } from "../../../config/env.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../errors/AppError.js";
import * as repo from "../repositories/return.repository.js";
import * as inventory from "../../inventory/services/inventory.service.js";
const returnNumber = () => `RET-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
const epochMilliseconds = (value: any) => value?.epochMilliseconds !== undefined ? Number(value.epochMilliseconds) : new Date(value).getTime();
const consuming = ["REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED", "COMPLETED"];
export const create = async (orderNumber: string, userId: number, data: any) => {
  const order: any = await repo.order(orderNumber, userId);
  if (!order) throw new NotFoundError("Order not found");
  if (order.status !== "DELIVERED" || !order.deliveredAt) throw new ConflictError("Only delivered orders can be returned");
  if (Date.now() > epochMilliseconds(order.deliveredAt) + config.returns.windowDays * 86400000) throw new ConflictError("Return window has expired");

  const requested = new Map<number, any>();
  for (const item of data.items) {
    if (requested.has(item.orderItemId)) throw new ValidationError("Duplicate return item");
    requested.set(item.orderItemId, item);
  }

  return db.transaction(async (tx: any) => {
    const lockedOrder: any = await tx.orm.public.Order.select("id", "status", "deliveredAt", "userId").first({ id: order.id, userId });
    if (!lockedOrder || lockedOrder.status !== "DELIVERED" || !lockedOrder.deliveredAt) throw new ConflictError("Only delivered orders can be returned");
    if (Date.now() > epochMilliseconds(lockedOrder.deliveredAt) + config.returns.windowDays * 86400000) throw new ConflictError("Return window has expired");

    const lockedItems: any[] = await repo.lockOrderItemsForReturn(tx, order.id, [...requested.keys()]);
    if (lockedItems.length !== requested.size) throw new ValidationError("Return item does not belong to order");
    const byId = new Map(lockedItems.map((item) => [item.id, item]));
    for (const [orderItemId, item] of requested) {
      const oi = byId.get(orderItemId);
      const previous: any[] = await repo.returnItemsForUpdate(tx, orderItemId);
      const used = previous.filter((x) => consuming.includes(x.return.status)).reduce((n, x) => n + x.quantity, 0);
      if (!oi || item.quantity > oi.quantity - used) throw new ConflictError("Return quantity exceeds returnable quantity");
    }

    const saved = await tx.orm.public.Return.create({ returnNumber: returnNumber(), orderId: order.id, userId, status: "REQUESTED", customerNote: data.customerNote ?? null });
    for (const item of requested.values()) await repo.item(tx, { returnId: saved.id, orderItemId: item.orderItemId, quantity: item.quantity, reason: item.reason, customerNote: item.customerNote ?? null });
    await repo.history(tx, { returnId: saved.id, fromStatus: null, toStatus: "REQUESTED", changedById: userId, note: null });
    return repo.findByNumber(saved.returnNumber);
  });
};
export const get = async (number: string, userId?: number) => { const x = userId ? await repo.findOwned(number, userId) : await repo.findByNumber(number); if (!x) throw new NotFoundError("Return not found"); return x; };
export const list = (q: any, userId?: number) => repo.list(q, userId);
export const transition = async (number: string, target: string, actorId: number, note?: string) => { const current: any = await get(number); const map: Record<string, string[]> = { REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"], APPROVED: ["IN_TRANSIT", "CANCELLED"], IN_TRANSIT: ["RECEIVED"], RECEIVED: ["COMPLETED"] }; if (!map[current.status]?.includes(target)) throw new ConflictError(`Invalid return transition ${current.status} to ${target}`); if (target === "COMPLETED" && current.items.some((x: any) => x.restockStatus === "PENDING")) throw new ConflictError("Return items must be finalized first"); return db.transaction(async (tx: any) => { const now = Temporal.Now.instant(); const timestamps: any = {}; if (target === "APPROVED") timestamps.approvedAt = now; if (target === "REJECTED") timestamps.rejectedAt = now; if (target === "RECEIVED") timestamps.receivedAt = now; if (target === "COMPLETED") timestamps.completedAt = now; if (target === "CANCELLED") timestamps.cancelledAt = now; const updated = await repo.update(tx, current.id, { status: target, ...timestamps }); await repo.history(tx, { returnId: current.id, fromStatus: current.status, toStatus: target, changedById: actorId, note: note ?? null }); return updated; }); };
export const inspect = async (
  number: string,
  itemId: number,
  data: any,
  actorId: number,
) => {
  const current: any = await get(number);
  const item = current.items.find((x: any) => x.id === itemId);
  if (!item || current.status !== "RECEIVED") {
    throw new ConflictError("Return item inspection is not allowed");
  }
  if (item.restockStatus !== "PENDING") {
    throw new ConflictError("Return item has already been finalized");
  }
  if (data.restockQuantity < 0 || data.restockQuantity > item.quantity) {
    throw new ValidationError("Invalid restock quantity");
  }

  const orderNumber = current.order?.orderNumber || "";

  return db.transaction(async (tx: any) => {
    const finalStatus =
      data.restockQuantity > 0 ? "RESTOCKED" : "NOT_RESTOCKABLE";

    if (data.restockQuantity > 0) {
      if (!item.orderItem.variantId) {
        throw new ConflictError(
          "Purchased variant is no longer available for restock",
        );
      }
      await inventory.restockStock(
        item.orderItem.variantId,
        data.restockQuantity,
        tx,
        {
          movementType: "RETURN",
          referenceType: "ORDER",
          referenceId: orderNumber,
          note:
            data.adminNote ||
            `Return inspection restock: ${data.condition} (${data.restockQuantity}/${item.quantity})`,
        },
      );
    }

    if (data.restockQuantity < item.quantity && item.orderItem.variantId) {
      const damagedCount = item.quantity - data.restockQuantity;
      await inventory.recordDamagedAuditMovement(
        item.orderItem.variantId,
        {
          referenceType: "ORDER",
          referenceId: orderNumber,
          note:
            data.adminNote ||
            `Return inspection damaged/not restockable (${damagedCount} unit(s), condition: ${data.condition})`,
        },
        tx,
      );
    }

    const finalized = await repo.finalizeItemIfPending(tx, item.id, {
      condition: data.condition,
      adminNote: data.adminNote ?? null,
      restockQuantity: data.restockQuantity,
      restockStatus: finalStatus,
    });

    if (!finalized) {
      throw new ConflictError("Return item has already been finalized");
    }

    // Check if all items in this return are now finalized
    const allItems: any[] = await tx.orm.public.ReturnItem.where({
      returnId: current.id,
    }).all();
    const allFinalized = allItems.every((it) => it.restockStatus !== "PENDING");

    if (allFinalized) {
      const now = Temporal.Now.instant();
      await repo.update(tx, current.id, {
        status: "COMPLETED",
        completedAt: now,
      });
      await repo.history(tx, {
        returnId: current.id,
        fromStatus: current.status,
        toStatus: "COMPLETED",
        changedById: actorId,
        note: "All return items inspected and finalized",
      });
    }

    return finalized;
  });
};

