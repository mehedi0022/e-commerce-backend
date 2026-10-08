import { Temporal } from "temporal-polyfill";
import crypto from "crypto";
import { db } from "../../../prisma/db.js";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthenticationError,
} from "../../../errors/AppError.js";
import * as repo from "../repositories/courier.repository.js";
import { getCourierAdapter } from "../courier.factory.js";
import { triggerNotification } from "../../sms/services/notification-trigger.service.js";
import * as inventory from "../../inventory/services/inventory.service.js";
import type { UpdateCourierProviderInput } from "../courier.types.js";

export const getProviders = async () => {
  return repo.findProviders();
};

export const getProviderById = async (id: number) => {
  const p = await repo.findProviderById(id);
  if (!p) throw new NotFoundError("Courier provider not found");
  return p;
};

export const updateProvider = async (
  id: number,
  data: UpdateCourierProviderInput,
) => {
  await getProviderById(id);

  if (data.isDefault) {
    await repo.clearDefaults(id);
  }

  return repo.updateProvider(id, data);
};

export const checkBalance = async (code: string) => {
  const config = await repo.findProviderByCode(code);
  if (!config) throw new NotFoundError(`Courier provider "${code}" not found`);

  const adapter = getCourierAdapter(code);
  if (!adapter.checkBalance) {
    throw new ValidationError(
      `Balance check is not supported for ${config.name}`,
    );
  }

  return adapter.checkBalance(config as any);
};

export const getStores = async (code: string) => {
  const config = await repo.findProviderByCode(code);
  if (!config) throw new NotFoundError(`Courier provider "${code}" not found`);

  const adapter = getCourierAdapter(code);
  if (!adapter.getStores) {
    throw new ValidationError(
      `Fetching stores is not supported for ${config.name}`,
    );
  }

  return adapter.getStores(config as any);
};

export const getCities = async (code: string) => {
  const config = await repo.findProviderByCode(code);
  if (!config) throw new NotFoundError(`Courier provider "${code}" not found`);

  const adapter = getCourierAdapter(code);
  if (!adapter.getCities) {
    return [];
  }

  return adapter.getCities(config as any);
};

export const getZones = async (code: string, cityId: number) => {
  const config = await repo.findProviderByCode(code);
  if (!config) throw new NotFoundError(`Courier provider "${code}" not found`);

  const adapter = getCourierAdapter(code);
  if (!adapter.getZones) {
    return [];
  }

  return adapter.getZones(config as any, cityId);
};

export const bookParcel = async (
  orderNumber: string,
  options?: {
    courierCode?: string;
    customNote?: string;
    itemWeightKg?: number;
    recipientCityId?: number;
    recipientZoneId?: number;
  },
) => {
  const order = await db.orm.public.Order.first({ orderNumber });
  if (!order) throw new NotFoundError(`Order ${orderNumber} not found`);

  if (order.status === "CANCELLED") {
    throw new ConflictError(
      "Cannot book a courier parcel for a cancelled order",
    );
  }

  // Get shipping address
  const shippingAddress = await db.orm.public.OrderAddress.first({
    orderId: order.id,
    type: "SHIPPING",
  });

  if (!shippingAddress) {
    throw new ValidationError("Order has no shipping address");
  }

  // Get order items
  const items = await db.orm.public.OrderItem.where({
    orderId: order.id,
  }).all();
  const itemsSummary = items
    .map((i: any) => `${i.productName} (x${i.quantity})`)
    .join(", ");

  const totalQuantity = items.reduce(
    (sum: number, i: any) => sum + (i.quantity || 1),
    0,
  );

  // Resolve courier provider
  let courierConfig: any = null;
  if (options?.courierCode) {
    courierConfig = await repo.findProviderByCode(options.courierCode);
  } else {
    courierConfig = await repo.findActiveProvider();
  }

  if (!courierConfig) {
    throw new ValidationError(
      "No active courier provider configured. Please activate Steadfast or Pathao in Settings.",
    );
  }

  // Check if shipment already exists
  const existingShipment: any = await db.orm.public.Shipment.first({
    orderId: order.id,
  });
  if (existingShipment?.consignmentId) {
    return {
      success: true,
      message: `Order already booked with ${existingShipment.courierName} (Consignment: ${existingShipment.consignmentId})`,
      consignmentId: String(existingShipment.consignmentId),
      trackingCode: String(
        existingShipment.trackingNumber || existingShipment.consignmentId,
      ),
      trackingUrl: existingShipment.trackingUrl || null,
      courierCode: existingShipment.courierCode || courierConfig.code,
      courierName: existingShipment.courierName,
      codAmount: Number(existingShipment.codAmount ?? 0),
      courierStatus: existingShipment.courierStatus,
      shipment: existingShipment,
      isDuplicate: true,
    };
  }

  const adapter = getCourierAdapter(courierConfig.code);

  const isOnlinePaid =
    order.paymentStatus === "PAID" ||
    (order.paymentMethod !== "CASH_ON_DELIVERY" &&
      order.paymentMethod !== "PARTIAL_COD" &&
      Number(order.dueAmount ?? 0) <= 0);

  const dueAmount = isOnlinePaid ? 0 : Math.max(0, Number(order.dueAmount ?? 0));
  const grandTotal = Number(order.grandTotal ?? 0);
  const advanceAmount = Number(order.advanceAmount ?? 0);

  let bookingResult: any;
  try {
    bookingResult = await adapter.createOrder(courierConfig as any, {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        grandTotal,
        dueAmount,
        advanceAmount,
        isAdvanceRequired: Boolean(order.isAdvanceRequired),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        customerNote: order.customerNote,
        itemsSummary,
        itemCount: totalQuantity,
        weightKg: options?.itemWeightKg || (options as any)?.weight || 0.5,
      },
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        district: shippingAddress.district,
        division: shippingAddress.division,
        upazila: shippingAddress.upazila,
        thana: shippingAddress.thana,
        area: shippingAddress.area,
        postalCode: shippingAddress.postalCode,
      },
      customNote: options?.customNote || (options as any)?.note,
      itemWeightKg: options?.itemWeightKg || (options as any)?.weight || 0.5,
      recipientCityId: options?.recipientCityId,
      recipientZoneId: options?.recipientZoneId,
    });
  } catch (err: any) {
    // Record failure in shipment to support retry without changing order status
    const errorMsg = String(err?.message || "Courier booking failed");
    const now = Temporal.Now.instant();
    if (existingShipment) {
      await db.orm.public.Shipment.where({ id: existingShipment.id }).update({
        lastDispatchError: errorMsg,
        failedAt: now,
      });
    } else {
      await db.orm.public.Shipment.create({
        orderId: order.id,
        status: "PENDING",
        courierName: courierConfig.name,
        courierCode: courierConfig.code,
        lastDispatchError: errorMsg,
        failedAt: now,
      });
    }
    throw err;
  }

  const now = Temporal.Now.instant();

  const shipmentResult = await db.transaction(async (tx: any) => {
    let shipmentId: number;
    if (existingShipment) {
      shipmentId = existingShipment.id;
      await tx.orm.public.Shipment.where({ id: existingShipment.id }).update({
        status: "READY_TO_SHIP",
        courierName: bookingResult.courierName,
        courierCode: courierConfig.code,
        consignmentId: String(bookingResult.consignmentId),
        trackingNumber: bookingResult.trackingCode,
        trackingUrl: bookingResult.trackingUrl || null,
        codAmount: bookingResult.codAmount,
        courierStatus: bookingResult.status,
        courierPayload: bookingResult.rawResponse || null,
        lastDispatchError: null,
        readyAt: now,
      });
    } else {
      const created = await tx.orm.public.Shipment.create({
        orderId: order.id,
        status: "READY_TO_SHIP",
        courierName: bookingResult.courierName,
        courierCode: courierConfig.code,
        consignmentId: String(bookingResult.consignmentId),
        trackingNumber: bookingResult.trackingCode,
        trackingUrl: bookingResult.trackingUrl || null,
        codAmount: bookingResult.codAmount,
        courierStatus: bookingResult.status,
        courierPayload: bookingResult.rawResponse || null,
        lastDispatchError: null,
        readyAt: now,
      });
      shipmentId = created.id;
    }

    await tx.orm.public.ShipmentStatusHistory.create({
      shipmentId,
      fromStatus: existingShipment?.status || null,
      toStatus: "READY_TO_SHIP",
      note: `Booked on ${bookingResult.courierName}. Consignment: ${bookingResult.consignmentId}, Tracking: ${bookingResult.trackingCode}`,
    });

    // Advance order to PROCESSING if still PENDING or CONFIRMED
    if (order.status === "PENDING" || order.status === "CONFIRMED") {
      await tx.orm.public.Order.where({ id: order.id }).update({
        status: "PROCESSING",
      });
      await tx.orm.public.OrderStatusHistory.create({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "PROCESSING",
        note: `Parcel booked with ${bookingResult.courierName} (Consignment ID: ${bookingResult.consignmentId}). Ready for dispatch.`,
      });
    }

    const shipment = await tx.orm.public.Shipment.first({ id: shipmentId });
    return shipment;
  });

  return {
    success: true,
    message: `Parcel booked successfully with ${bookingResult.courierName}`,
    consignmentId: String(bookingResult.consignmentId),
    trackingCode: String(
      bookingResult.trackingCode || bookingResult.consignmentId,
    ),
    trackingUrl: bookingResult.trackingUrl || null,
    courierCode: courierConfig.code,
    courierName: bookingResult.courierName,
    codAmount: Number(
      bookingResult.codAmount ?? shipmentResult?.codAmount ?? 0,
    ),
    courierStatus: bookingResult.status,
    booking: bookingResult,
    shipment: shipmentResult,
  };
};

export const bulkBookParcels = async (params: {
  orderNumbers: string[];
  courierCode?: string;
  customNote?: string;
  itemWeightKg?: number;
}) => {
  const { orderNumbers, courierCode, customNote, itemWeightKg } = params;
  const results: Array<{
    orderNumber: string;
    success: boolean;
    consignmentId?: string;
    trackingCode?: string;
    trackingUrl?: string | null;
    courierName?: string;
    error?: string;
  }> = [];

  let succeeded = 0;
  let failed = 0;

  for (const orderNumber of orderNumbers) {
    try {
      const res = await bookParcel(orderNumber, {
        courierCode,
        customNote,
        itemWeightKg,
      });

      succeeded++;
      results.push({
        orderNumber,
        success: true,
        consignmentId: res.consignmentId,
        trackingCode: res.trackingCode,
        trackingUrl: res.trackingUrl,
        courierName: res.courierName,
      });
    } catch (err: any) {
      failed++;
      results.push({
        orderNumber,
        success: false,
        error: err?.message || "Failed to book parcel with courier",
      });
    }
  }

  return {
    total: orderNumbers.length,
    succeeded,
    failed,
    results,
  };
};

//// eeee

export const syncOrderCourierStatus = async (orderNumber: string) => {
  const order = await db.orm.public.Order.first({ orderNumber });
  if (!order) throw new NotFoundError(`Order ${orderNumber} not found`);

  const shipment: any = await db.orm.public.Shipment.first({
    orderId: order.id,
  });
  if (!shipment || (!shipment.trackingNumber && !shipment.consignmentId)) {
    throw new NotFoundError("No courier shipment registered for this order");
  }

  const courierCode = shipment.courierCode || "steadfast";
  const courierConfig = await repo.findProviderByCode(courierCode);
  if (!courierConfig) {
    throw new ValidationError(`Configuration for ${courierCode} not found`);
  }

  const adapter = getCourierAdapter(courierCode);
  const trackingResult = await adapter.checkStatus(
    courierConfig as any,
    shipment.trackingNumber || shipment.consignmentId,
  );

  const statusToApply = trackingResult.rawStatus || trackingResult.status;
  const updateResult = await applyShipmentCourierStatusUpdate(
    shipment.id,
    statusToApply,
    trackingResult.rawResponse,
  );

  return {
    orderNumber,
    courierName: shipment.courierName,
    consignmentId: shipment.consignmentId,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    courierStatus: statusToApply,
    shipmentStatus: updateResult?.shipment?.status,
    orderStatus: updateResult?.order?.status,
    updated: updateResult?.updated ?? false,
  };
};

const ACTIVE_SHIPMENT_STATUSES = [
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "FAILED",
] as const;
let syncRunning = false;

export const syncActiveShipments = async () => {
  if (syncRunning) throw new ConflictError("Courier sync is already running");
  syncRunning = true;
  try {
    const shipments: any[] = [];
    for (const status of ACTIVE_SHIPMENT_STATUSES) {
      shipments.push(...(await db.orm.public.Shipment.where({ status }).all()));
    }
    const valid = shipments.filter(
      (s) => (s.consignmentId || s.trackingNumber) && s.courierCode,
    );

    const results: any[] = [];
    let updatedCount = 0;

    const worker = async (s: any) => {
      try {
        const cfg = await repo.findProviderByCode(s.courierCode);
        if (!cfg) return;
        const tracking = await getCourierAdapter(s.courierCode).checkStatus(
          cfg as any,
          s.trackingNumber || s.consignmentId,
        );
        const statusToApply = tracking.rawStatus || tracking.status;
        const res = await applyShipmentCourierStatusUpdate(
          s.id,
          statusToApply,
          tracking.rawResponse,
        );
        if (res?.updated) updatedCount++;
        results.push({
          shipmentId: s.id,
          orderId: s.orderId,
          courierCode: s.courierCode,
          consignmentId: s.consignmentId,
          status: statusToApply,
          updated: res?.updated ?? false,
        });
      } catch (err: any) {
        results.push({
          shipmentId: s.id,
          courierCode: s.courierCode,
          consignmentId: s.consignmentId,
          error: err.message,
        });
      }
    };
    for (let i = 0; i < valid.length; i += 3) {
      await Promise.all(valid.slice(i, i + 3).map(worker));
    }

    return { totalChecked: valid.length, updatedCount, results };
  } finally {
    syncRunning = false;
  }
};

///gggggg

// ─── Courier status resolution ───────────────────────────────────────────────
type CourierNorm = { shipmentStatus: string; orderStatus?: string };

const statusKey = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/^order[._\-\s]+/, "")
    .replace(/[\s.\-]+/g, "_");

const IN_TRANSIT: CourierNorm = {
  shipmentStatus: "IN_TRANSIT",
  orderStatus: "SHIPPED",
};

// null = চেনা status, কিন্তু কিছু করার নেই। map-এ না থাকলে ignore + warn।
const COURIER_STATUS_MAPS: Record<
  string,
  Record<string, CourierNorm | null>
> = {
  steadfast: {
    pending: null,
    in_review: null,
    delivered: { shipmentStatus: "DELIVERED", orderStatus: "DELIVERED" },
    cancelled: { shipmentStatus: "RETURNED", orderStatus: "CANCELLED" },
    hold: { shipmentStatus: "FAILED" },
    // *_approval_pending, unknown → final না, তাই ignore
  },
  pathao: {
    order_created: null,
    order_updated: null,
    pending: null,
    pickup_requested: null,
    assigned_for_pickup: null,
    pickup_assigned: null,
    pickup_failed: null,
    pickup_cancelled: null,
    pickup: IN_TRANSIT,
    picked: IN_TRANSIT,
    picked_up: IN_TRANSIT,
    at_the_sorting_hub: IN_TRANSIT,
    in_transit: IN_TRANSIT,
    received_at_last_mile_hub: IN_TRANSIT,
    assigned_for_delivery: {
      shipmentStatus: "OUT_FOR_DELIVERY",
      orderStatus: "SHIPPED",
    },
    delivered: { shipmentStatus: "DELIVERED", orderStatus: "DELIVERED" },
    delivery_failed: { shipmentStatus: "FAILED" },
    on_hold: { shipmentStatus: "FAILED" },
    // Return flow: order cancel + stock restore শুধু parcel merchant-এর কাছে ফিরলে
    return: { shipmentStatus: "RETURNED" },
    returned: { shipmentStatus: "RETURNED" },
    return_id_created: { shipmentStatus: "RETURNED" },
    return_in_transit: { shipmentStatus: "RETURNED" },
    returned_to_merchant: {
      shipmentStatus: "RETURNED",
      orderStatus: "CANCELLED",
    },
    // payment_invoice, paid_return, exchange, store_* → ignore
  },
};

const REVIEW_STATUSES = new Set(["partial_delivered", "partial_delivery"]);

export const resolveCourierStatus = (code: string, raw: string) => {
  const key = statusKey(raw);
  if (REVIEW_STATUSES.has(key))
    return { norm: null as CourierNorm | null, needsReview: true };
  const map = COURIER_STATUS_MAPS[code] ?? {};
  if (key in map) return { norm: map[key], needsReview: false };
  console.warn(`[courier] unmapped ${code} status "${raw}" ignored`);
  return { norm: null as CourierNorm | null, needsReview: false };
};

// ─── Per-shipment in-process lock (একই shipment-এ parallel webhook/cron ঠেকাতে) ─
const shipmentLocks = new Map<number, Promise<unknown>>();
const withShipmentLock = async <T>(
  id: number,
  fn: () => Promise<T>,
): Promise<T> => {
  const prev = shipmentLocks.get(id) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  shipmentLocks.set(id, next);
  try {
    return await next;
  } finally {
    if (shipmentLocks.get(id) === next) shipmentLocks.delete(id);
  }
};

const SHIPMENT_STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  READY_TO_SHIP: 1,
  SHIPPED: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
};

const ORDER_FINAL = new Set(["DELIVERED", "CANCELLED"]);

export const applyShipmentCourierStatusUpdate = (
  shipmentId: number,
  rawCourierStatus: string,
  rawPayload?: any,
) =>
  withShipmentLock(shipmentId, async () => {
    const rawStatus = String(rawCourierStatus ?? "").trim();
    let updated = false;
    let needsReview = false;
    let deliveredNow = false;
    let shippedNow = false;

    const found = await db.transaction(async (tx: any) => {
      // Read inside transaction under lock
      const shipment: any = await tx.orm.public.Shipment.first({
        id: shipmentId,
      });
      if (!shipment) return false;
      const order: any = await tx.orm.public.Order.first({
        id: shipment.orderId,
      });
      if (!order) return false;

      // DELIVERED is terminal: once delivered, late/out-of-order events are ignored
      if (shipment.status === "DELIVERED") return true;

      const code = String(shipment.courierCode ?? "").toLowerCase();
      const resolved = resolveCourierStatus(code, rawStatus);
      needsReview = resolved.needsReview;
      const norm = resolved.norm;
      const now = Temporal.Now.instant();

      const base: any = { courierStatus: rawStatus, updatedAt: now };
      if (rawPayload) base.courierPayload = rawPayload;

      // Unmapped / no-op status: log courierStatus only
      if (!norm) {
        await tx.orm.public.Shipment.where({ id: shipment.id }).update(base);
        return true;
      }

      // Return terminal: cannot regress back to in-transit or other statuses
      if (shipment.status === "RETURNED" && norm.shipmentStatus !== "RETURNED") {
        return true;
      }

      // 1. Shipment Forward-Only Status Progression
      let targetShipmentStatus = norm.shipmentStatus;
      if (
        targetShipmentStatus !== "RETURNED" &&
        targetShipmentStatus !== "FAILED"
      ) {
        const currentRank = SHIPMENT_STATUS_RANK[shipment.status] ?? -1;
        const targetRank = SHIPMENT_STATUS_RANK[targetShipmentStatus] ?? -1;
        if (targetRank < currentRank) {
          // Prevent backwards status regression from delayed/out-of-order webhooks
          targetShipmentStatus = shipment.status;
        }
      }

      const shipmentChanged = shipment.status !== targetShipmentStatus;
      const sData: any = { ...base };
      if (shipmentChanged) {
        sData.status = targetShipmentStatus;
        if (
          (targetShipmentStatus === "IN_TRANSIT" ||
            targetShipmentStatus === "OUT_FOR_DELIVERY" ||
            targetShipmentStatus === "SHIPPED") &&
          !shipment.shippedAt
        ) {
          sData.shippedAt = now;
        }
        if (targetShipmentStatus === "DELIVERED") sData.deliveredAt = now;
        if (targetShipmentStatus === "RETURNED") sData.returnedAt = now;
        if (targetShipmentStatus === "FAILED") sData.failedAt = now;
      }
      await tx.orm.public.Shipment.where({ id: shipment.id }).update(sData);
      if (shipmentChanged) {
        await tx.orm.public.ShipmentStatusHistory.create({
          shipmentId: shipment.id,
          fromStatus: shipment.status,
          toStatus: targetShipmentStatus,
          note: `Courier status updated to "${rawStatus}"`,
        });
      }

      // Ensure stock committed if shipment reached SHIPPED or DELIVERED
      if (
        targetShipmentStatus === "SHIPPED" ||
        targetShipmentStatus === "DELIVERED" ||
        norm.orderStatus === "SHIPPED" ||
        norm.orderStatus === "DELIVERED"
      ) {
        await inventory.ensureOrderStockCommitted(order.id, order.orderNumber, tx);
      }

      // 2. Order Status Update
      let orderChanged = false;
      if (
        norm.orderStatus &&
        order.status !== norm.orderStatus &&
        !ORDER_FINAL.has(order.status)
      ) {
        const o: any = { status: norm.orderStatus };

        if (norm.orderStatus === "SHIPPED") {
          if (!order.shippedAt) o.shippedAt = now;
          shippedNow = true;
        }

        if (norm.orderStatus === "DELIVERED") {
          o.deliveredAt = now;
          // Auto-mark PAID ONLY for CASH_ON_DELIVERY / PARTIAL_COD
          const isCOD =
            order.paymentMethod === "CASH_ON_DELIVERY" ||
            order.paymentMethod === "PARTIAL_COD";
          if (
            isCOD &&
            order.paymentStatus !== "PAID" &&
            Number(order.dueAmount ?? 0) > 0
          ) {
            o.paymentStatus = "PAID";
            o.dueAmount = "0.00";
          }
          deliveredNow = true;
        }

        if (norm.orderStatus === "CANCELLED") {
          o.cancelledAt = now;
          const stockCommitted =
            Boolean(order.shippedAt) ||
            (await inventory.isOrderStockCommitted(order.orderNumber, tx));
          if (stockCommitted) {
            // DO NOT auto-restock! Create Return record for physical inspection
            await inventory.createReturnForOrder(
              order.id,
              order.orderNumber,
              tx,
              {
                note: `Courier return/cancellation: "${rawStatus}"`,
              },
            );
          } else {
            // Cancelled before physical departure: release reservations
            const items = await tx.orm.public.OrderItem.where({
              orderId: order.id,
            }).all();
            for (const item of items) {
              if (!item.variantId) continue;
              await inventory.releaseStock(item.variantId, item.quantity, tx, {
                referenceType: "ORDER",
                referenceId: order.orderNumber,
              });
            }
          }
        }

        await tx.orm.public.Order.where({ id: order.id }).update(o);
        await tx.orm.public.OrderStatusHistory.create({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: norm.orderStatus,
          note: `Auto-synced via Courier (${shipment.courierName || shipment.courierCode || "Courier"}): "${rawStatus}"`,
        });
        orderChanged = true;
      }

      updated = shipmentChanged || orderChanged;
      return true;
    });

    if (!found) return null;

    if (needsReview) {
      console.warn(
        `[courier] shipment ${shipmentId} needs manual review: "${rawStatus}"`,
      );
    }

    const shipment: any = await db.orm.public.Shipment.first({
      id: shipmentId,
    });
    const order: any = await db.orm.public.Order.first({
      id: shipment.orderId,
    });

    // SMS notifications only after commit and when status genuinely transitioned
    if (deliveredNow) {
      void triggerNotification("ORDER_DELIVERED", {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
    } else if (shippedNow) {
      void triggerNotification("ORDER_SHIPPED", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        courierName: shipment.courierName,
        courierTrackingNumber: shipment.trackingNumber,
        courierTrackingUrl: shipment.trackingUrl,
      });
    }

    return { shipment, order, updated, needsReview };
  });

// ─── Webhook ────────────────────────────────────────────────────────────────
const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

const verifyCourierWebhook = (code: string, cfg: any, headers: any) => {
  const settings = (cfg.settings || {}) as Record<string, any>;
  const secret = String(
    settings.webhookSecret ||
      process.env[`${code.toUpperCase()}_WEBHOOK_SECRET`] ||
      "",
  );
  if (!secret) {
    throw new AuthenticationError(`Webhook secret for ${code} is not configured`);
  }

  let incoming = "";
  if (code === "steadfast") {
    const authHeader = String(headers?.authorization ?? "").trim();
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      throw new AuthenticationError("Missing Bearer authorization header for Steadfast webhook");
    }
    incoming = authHeader.replace(/^Bearer\s+/i, "").trim();
  } else if (code === "pathao") {
    incoming = String(headers?.["x-pathao-signature"] ?? "").trim();
    if (!incoming) {
      throw new AuthenticationError("Missing X-Pathao-Signature header for Pathao webhook");
    }
  } else {
    throw new AuthenticationError(`Webhooks are not supported for ${code}`);
  }

  if (!incoming || !safeEqual(incoming, secret)) {
    throw new AuthenticationError(`Invalid ${code} webhook credentials`);
  }
};

const pickRawStatus = (code: string, body: any): string =>
  String(
    (code === "pathao"
      ? body?.event || body?.order_status_slug || body?.order_status
      : body?.status || body?.delivery_status) ?? "",
  ).trim();

export const handleCourierWebhook = async (
  courierCode: string,
  body: any,
  headers?: any,
) => {
  const code = courierCode.toLowerCase().trim();

  const cfg = await repo.findProviderByCode(code);
  if (!cfg) throw new NotFoundError(`Unknown courier: ${code}`);
  verifyCourierWebhook(code, cfg, headers); // 401 on missing/unconfigured secret or mismatch

  const rawStatus = pickRawStatus(code, body);
  const consignmentId = String(
    body?.consignment_id || body?.consignmentId || "",
  ).trim();
  const invoice = String(
    body?.merchant_order_id || body?.invoice || body?.orderNumber || "",
  ).trim();
  const trackingCode = String(
    body?.tracking_code || body?.trackingNumber || "",
  ).trim();

  // Persistent event audit log
  let eventLogId: number | null = null;
  try {
    const createdEvent = await db.orm.public.CourierWebhookEvent.create({
      courierCode: code,
      event: rawStatus || null,
      status: rawStatus || null,
      consignmentId: consignmentId || null,
      trackingCode: trackingCode || null,
      merchantOrderId: invoice || null,
      payload: body ? JSON.parse(JSON.stringify(body)) : null,
      headers: headers ? JSON.parse(JSON.stringify(headers)) : null,
      outcome: "RECEIVED",
      receivedAt: Temporal.Now.instant(),
    });
    eventLogId = createdEvent.id;
  } catch (err: any) {
    console.error("[courier] failed to insert webhook event log:", err.message);
  }

  const updateOutcome = async (outcome: string, error?: string) => {
    if (!eventLogId) return;
    try {
      await db.orm.public.CourierWebhookEvent.where({ id: eventLogId }).update({
        outcome,
        error: error || null,
      });
    } catch (e: any) {
      console.error("[courier] failed to update webhook event outcome:", e.message);
    }
  };

  if (!consignmentId && !invoice && !trackingCode) {
    await updateOutcome("IGNORED_NO_IDENTIFIERS");
    return {
      success: true,
      ignored: true,
      message: "No shipment identifier in payload",
    };
  }

  let shipment: any = null;
  if (consignmentId)
    shipment = await db.orm.public.Shipment.first({ consignmentId });
  if (!shipment && trackingCode)
    shipment = await db.orm.public.Shipment.first({
      trackingNumber: trackingCode,
    });
  if (!shipment && invoice) {
    const order = await db.orm.public.Order.first({ orderNumber: invoice });
    if (order)
      shipment = await db.orm.public.Shipment.first({ orderId: order.id });
  }

  // Answer 200 so courier does not retry forever on valid payload with unknown shipment
  if (!shipment) {
    await updateOutcome("UNMATCHED_SHIPMENT");
    return {
      success: false,
      message: `No matching shipment found (${consignmentId || invoice || trackingCode})`,
    };
  }

  // Prevent cross-courier contamination
  if (
    shipment.courierCode &&
    String(shipment.courierCode).toLowerCase() !== code
  ) {
    await updateOutcome("COURIER_MISMATCH");
    return {
      success: false,
      message: `Shipment #${shipment.id} does not belong to ${code}`,
    };
  }

  if (!rawStatus) {
    await updateOutcome("IGNORED_NO_STATUS");
    return { success: true, ignored: true, message: "No status in payload" };
  }

  try {
    const result = await applyShipmentCourierStatusUpdate(
      shipment.id,
      rawStatus,
      body,
    );
    await updateOutcome(
      result?.updated ? "PROCESSED_UPDATED" : "PROCESSED_NO_CHANGE",
    );
    return {
      success: true,
      message: `Shipment #${shipment.id} processed via ${code} webhook`,
      updated: result?.updated ?? false,
    };
  } catch (err: any) {
    await updateOutcome("ERROR", err.message);
    throw err;
  }
};

export const trackParcel = async (orderNumber: string) => {
  const order = await db.orm.public.Order.first({ orderNumber });
  if (!order) throw new NotFoundError(`Order ${orderNumber} not found`);

  const shipment: any = await db.orm.public.Shipment.first({
    orderId: order.id,
  });
  if (!shipment || (!shipment.trackingNumber && !shipment.consignmentId)) {
    throw new NotFoundError(
      "No shipment or courier tracking information found for this order",
    );
  }

  const courierCode = shipment.courierCode || "steadfast";
  const courierConfig = await repo.findProviderByCode(courierCode);

  if (!courierConfig) {
    throw new ValidationError(
      `Courier configuration for ${courierCode} not found`,
    );
  }

  const adapter = getCourierAdapter(courierCode);
  const trackingResult = await adapter.checkStatus(
    courierConfig as any,
    shipment.trackingNumber || shipment.consignmentId,
  );

  // Automatically sync status in database if changed
  const statusToApply = trackingResult.rawStatus || trackingResult.status;
  if (statusToApply) {
    await applyShipmentCourierStatusUpdate(
      shipment.id,
      statusToApply,
      trackingResult.rawResponse,
    );
  }

  const refreshedShipment: any = await db.orm.public.Shipment.first({
    id: shipment.id,
  });

  return {
    orderNumber,
    courierName: refreshedShipment.courierName,
    trackingNumber: refreshedShipment.trackingNumber,
    trackingUrl: refreshedShipment.trackingUrl,
    consignmentId: refreshedShipment.consignmentId,
    codAmount: refreshedShipment.codAmount,
    status: trackingResult.status,
    rawStatus: trackingResult.rawStatus,
    shipmentStatus: refreshedShipment.status,
    rawResponse: trackingResult.rawResponse,
  };
};

const lastDigits = (v: unknown, n = 10) =>
  String(v ?? "")
    .replace(/\D/g, "")
    .slice(-n);

// Guest/public tracking: order number + phone are mandatory, last 10 digits exact match
export const trackParcelPublic = async (orderNumber: string, phone: string) => {
  const normalizedNumber = orderNumber.trim();
  const order: any = await db.orm.public.Order.first({ orderNumber: normalizedNumber });

  const given = lastDigits(phone, 10);
  const ok =
    order && given.length === 10 && given === lastDigits(order.customerPhone, 10);

  // Return identical error for missing order or phone mismatch to prevent enumeration
  if (!ok) {
    throw new NotFoundError("No order found matching the provided details");
  }

  const shipment: any = await db.orm.public.Shipment.first({
    orderId: order.id,
  });

  // Read-only minimal safe fields for customer
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    courierName: shipment?.courierName ?? null,
    trackingNumber: shipment?.trackingNumber ?? null,
    trackingUrl: shipment?.trackingUrl ?? null,
    shipmentStatus: shipment?.status ?? null,
    courierStatus: shipment?.courierStatus ?? null,
  };
};

