import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import { NotFoundError, ConflictError, ValidationError } from "../../../errors/AppError.js";
import * as repo from "../repositories/courier.repository.js";
import { getCourierAdapter } from "../courier.factory.js";
import { triggerNotification } from "../../sms/services/notification-trigger.service.js";
import type { UpdateCourierProviderInput } from "../courier.types.js";

export const getProviders = async () => {
  return repo.findProviders();
};

export const getProviderById = async (id: number) => {
  const p = await repo.findProviderById(id);
  if (!p) throw new NotFoundError("Courier provider not found");
  return p;
};

export const updateProvider = async (id: number, data: UpdateCourierProviderInput) => {
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
    throw new ValidationError(`Balance check is not supported for ${config.name}`);
  }

  return adapter.checkBalance(config as any);
};

export const getStores = async (code: string) => {
  const config = await repo.findProviderByCode(code);
  if (!config) throw new NotFoundError(`Courier provider "${code}" not found`);

  const adapter = getCourierAdapter(code);
  if (!adapter.getStores) {
    throw new ValidationError(`Fetching stores is not supported for ${config.name}`);
  }

  return adapter.getStores(config as any);
};

export const bookParcel = async (
  orderNumber: string,
  options?: {
    courierCode?: string;
    customNote?: string;
    itemWeightKg?: number;
  }
) => {
  const order = await db.orm.public.Order.first({ orderNumber });
  if (!order) throw new NotFoundError(`Order ${orderNumber} not found`);

  if (order.status === "CANCELLED") {
    throw new ConflictError("Cannot book a courier parcel for a cancelled order");
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
  const items = await db.orm.public.OrderItem.where({ orderId: order.id }).all();
  const itemsSummary = items
    .map((i: any) => `${i.productName} (x${i.quantity})`)
    .join(", ");

  const totalQuantity = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);

  // Resolve courier provider
  let courierConfig: any = null;
  if (options?.courierCode) {
    courierConfig = await repo.findProviderByCode(options.courierCode);
  } else {
    courierConfig = await repo.findActiveProvider();
  }

  if (!courierConfig) {
    throw new ValidationError(
      "No active courier provider configured. Please activate Steadfast or Pathao in Settings."
    );
  }

  // Check if shipment already exists
  const existingShipment: any = await db.orm.public.Shipment.first({ orderId: order.id });
  if (existingShipment?.consignmentId) {
    throw new ConflictError(
      `Order already has an active consignment (${existingShipment.consignmentId}) with ${existingShipment.courierName}.`
    );
  }

  const adapter = getCourierAdapter(courierConfig.code);

  const dueAmount = Number(order.dueAmount ?? 0);
  const grandTotal = Number(order.grandTotal ?? 0);
  const advanceAmount = Number(order.advanceAmount ?? 0);

  const bookingResult = await adapter.createOrder(courierConfig as any, {
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
  });

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

    // Advance order to PROCESSING if still PENDING
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

  // Trigger notification if tracking URL available
  if (bookingResult.trackingUrl) {
    void triggerNotification("ORDER_SHIPPED", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      courierName: bookingResult.courierName,
      courierTrackingNumber: bookingResult.trackingCode,
      courierTrackingUrl: bookingResult.trackingUrl,
    });
  }

  return {
    success: true,
    message: `Parcel booked successfully with ${bookingResult.courierName}`,
    consignmentId: String(bookingResult.consignmentId),
    trackingCode: String(bookingResult.trackingCode || bookingResult.consignmentId),
    trackingUrl: bookingResult.trackingUrl || null,
    courierCode: courierConfig.code,
    courierName: bookingResult.courierName,
    codAmount: Number(bookingResult.codAmount ?? shipmentResult?.codAmount ?? 0),
    courierStatus: bookingResult.status,
    booking: bookingResult,
    shipment: shipmentResult,
  };
};

export const normalizeCourierStatus = (
  rawStatus: string
): { shipmentStatus: string; orderStatus?: string } => {
  const s = String(rawStatus).toLowerCase().trim();

  // 1. Delivered
  if (
    s.includes("delivered") ||
    s === "delv" ||
    s === "completed" ||
    s === "success"
  ) {
    return { shipmentStatus: "DELIVERED", orderStatus: "DELIVERED" };
  }

  // 2. Returned / Cancelled
  if (
    s.includes("return") ||
    s.includes("cancel") ||
    s.includes("rto") ||
    s.includes("rejected")
  ) {
    return { shipmentStatus: "RETURNED", orderStatus: "CANCELLED" };
  }

  // 3. Out for delivery
  if (s.includes("out_for_delivery") || s.includes("out for delivery")) {
    return { shipmentStatus: "OUT_FOR_DELIVERY", orderStatus: "SHIPPED" };
  }

  // 4. In transit / Picked / Dispatched
  if (
    s.includes("transit") ||
    s.includes("picked") ||
    s.includes("hub") ||
    s.includes("dispatch") ||
    s.includes("in_review") ||
    s.includes("on_the_way")
  ) {
    return { shipmentStatus: "IN_TRANSIT", orderStatus: "SHIPPED" };
  }

  // 5. Failed / Hold
  if (s.includes("fail") || s.includes("hold")) {
    return { shipmentStatus: "FAILED", orderStatus: "SHIPPED" };
  }

  // Default to SHIPPED
  return { shipmentStatus: "SHIPPED", orderStatus: "SHIPPED" };
};

export const applyShipmentCourierStatusUpdate = async (
  shipmentId: number,
  rawCourierStatus: string,
  rawPayload?: any
) => {
  const shipment: any = await db.orm.public.Shipment.first({ id: shipmentId });
  if (!shipment) return null;

  const order: any = await db.orm.public.Order.first({ id: shipment.orderId });
  if (!order) return null;

  const { shipmentStatus, orderStatus } = normalizeCourierStatus(rawCourierStatus);
  const now = Temporal.Now.instant();

  // If already reached terminal state and nothing changed, skip
  if (
    shipment.status === shipmentStatus &&
    shipment.courierStatus === rawCourierStatus &&
    (!orderStatus || order.status === orderStatus)
  ) {
    return { shipment, order, updated: false };
  }

  await db.transaction(async (tx: any) => {
    // 1. Update Shipment
    const shipmentUpdateData: any = {
      courierStatus: rawCourierStatus,
      updatedAt: now,
    };

    if (shipment.status !== shipmentStatus) {
      shipmentUpdateData.status = shipmentStatus;
      if (shipmentStatus === "SHIPPED" && !shipment.shippedAt) shipmentUpdateData.shippedAt = now;
      if (shipmentStatus === "DELIVERED") shipmentUpdateData.deliveredAt = now;
      if (shipmentStatus === "RETURNED") shipmentUpdateData.returnedAt = now;
      if (shipmentStatus === "FAILED") shipmentUpdateData.failedAt = now;
      if (shipmentStatus === "CANCELLED") shipmentUpdateData.cancelledAt = now;
    }

    if (rawPayload) {
      shipmentUpdateData.courierPayload = rawPayload;
    }

    await tx.orm.public.Shipment.where({ id: shipment.id }).update(shipmentUpdateData);

    // Record Shipment Status History if changed
    if (shipment.status !== shipmentStatus) {
      await tx.orm.public.ShipmentStatusHistory.create({
        shipmentId: shipment.id,
        fromStatus: shipment.status,
        toStatus: shipmentStatus,
        note: `Courier status updated to "${rawCourierStatus}"`,
      });
    }

    // 2. Update Order
    if (orderStatus && order.status !== orderStatus) {
      const orderUpdateData: any = {
        status: orderStatus,
      };

      if (orderStatus === "SHIPPED" && !order.shippedAt) {
        orderUpdateData.shippedAt = now;
      }

      if (orderStatus === "DELIVERED") {
        orderUpdateData.deliveredAt = now;
        // If COD order or partially paid, mark as PAID when customer receives parcel!
        if (order.paymentStatus !== "PAID") {
          orderUpdateData.paymentStatus = "PAID";
          orderUpdateData.dueAmount = "0.00";
        }
      }

      if (orderStatus === "CANCELLED") {
        orderUpdateData.cancelledAt = now;
      }

      await tx.orm.public.Order.where({ id: order.id }).update(orderUpdateData);

      await tx.orm.public.OrderStatusHistory.create({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: orderStatus,
        note: `Auto-synced via Courier (${shipment.courierName || shipment.courierCode || "Courier"}): "${rawCourierStatus}"`,
      });
    }
  });

  // 3. Trigger Customer SMS/Email Notification upon Delivery or Shipped
  if (orderStatus === "DELIVERED" && order.status !== "DELIVERED") {
    void triggerNotification("ORDER_DELIVERED", {
      orderId: order.id,
    });
  } else if (orderStatus === "SHIPPED" && order.status !== "SHIPPED") {
    void triggerNotification("ORDER_SHIPPED", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      courierName: shipment.courierName,
      courierTrackingNumber: shipment.trackingNumber || shipment.consignmentId,
      courierTrackingUrl: shipment.trackingUrl,
    });
  }

  const updatedShipment = await db.orm.public.Shipment.first({ id: shipment.id });
  const updatedOrder = await db.orm.public.Order.first({ id: order.id });

  return { shipment: updatedShipment, order: updatedOrder, updated: true };
};

export const handleCourierWebhook = async (
  courierCode: string,
  body: any,
  _headers?: any
) => {
  const code = courierCode.toLowerCase();

  // Find shipment by consignmentId, trackingNumber, or order invoice
  const consignmentId = String(body?.consignment_id || body?.consignmentId || body?.consignment || "").trim();
  const invoice = String(body?.merchant_order_id || body?.invoice || body?.orderNumber || "").trim();
  const trackingCode = String(body?.tracking_code || body?.trackingNumber || "").trim();

  let shipment: any = null;

  if (consignmentId) {
    shipment = await db.orm.public.Shipment.first({ consignmentId });
  }

  if (!shipment && trackingCode) {
    shipment = await db.orm.public.Shipment.first({ trackingNumber: trackingCode });
  }

  if (!shipment && invoice) {
    const order = await db.orm.public.Order.first({ orderNumber: invoice });
    if (order) {
      shipment = await db.orm.public.Shipment.first({ orderId: order.id });
    }
  }

  if (!shipment) {
    return {
      success: false,
      message: `No matching shipment found for webhook identifier (${consignmentId || invoice || trackingCode})`,
    };
  }

  // Extract raw status
  const rawStatus =
    body?.order_status ||
    body?.order_status_slug ||
    body?.status ||
    body?.delivery_status ||
    "";

  if (!rawStatus) {
    return {
      success: false,
      message: "Webhook payload did not contain a recognizable status",
    };
  }

  const result = await applyShipmentCourierStatusUpdate(shipment.id, String(rawStatus), body);

  return {
    success: true,
    message: `Shipment #${shipment.id} status updated via ${code} webhook`,
    result,
  };
};

export const syncOrderCourierStatus = async (orderNumber: string) => {
  const order = await db.orm.public.Order.first({ orderNumber });
  if (!order) throw new NotFoundError(`Order ${orderNumber} not found`);

  const shipment: any = await db.orm.public.Shipment.first({ orderId: order.id });
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
    shipment.trackingNumber || shipment.consignmentId
  );

  const statusToApply = trackingResult.rawStatus || trackingResult.status;
  const updateResult = await applyShipmentCourierStatusUpdate(
    shipment.id,
    statusToApply,
    trackingResult.rawResponse
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

export const syncActiveShipments = async () => {
  const allShipments: any[] = await db.orm.public.Shipment.all();
  const activeStatuses = new Set([
    "READY_TO_SHIP",
    "SHIPPED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
  ]);

  const validShipments = allShipments.filter(
    (s) =>
      activeStatuses.has(s.status) &&
      (s.consignmentId || s.trackingNumber) &&
      s.courierCode
  );

  const results: any[] = [];
  let updatedCount = 0;

  for (const s of validShipments) {
    try {
      const courierConfig = await repo.findProviderByCode(s.courierCode);
      if (!courierConfig || !courierConfig.isActive) continue;

      const adapter = getCourierAdapter(s.courierCode);
      const tracking = await adapter.checkStatus(
        courierConfig as any,
        s.trackingNumber || s.consignmentId
      );

      const statusToApply = tracking.rawStatus || tracking.status;
      const res = await applyShipmentCourierStatusUpdate(
        s.id,
        statusToApply,
        tracking.rawResponse
      );

      if (res?.updated) {
        updatedCount++;
      }

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
  }

  return {
    totalChecked: validShipments.length,
    updatedCount,
    results,
  };
};

export const trackParcel = async (orderNumber: string) => {
  const order = await db.orm.public.Order.first({ orderNumber });
  if (!order) throw new NotFoundError(`Order ${orderNumber} not found`);

  const shipment: any = await db.orm.public.Shipment.first({ orderId: order.id });
  if (!shipment || (!shipment.trackingNumber && !shipment.consignmentId)) {
    throw new NotFoundError("No shipment or courier tracking information found for this order");
  }

  const courierCode = shipment.courierCode || "steadfast";
  const courierConfig = await repo.findProviderByCode(courierCode);

  if (!courierConfig) {
    throw new ValidationError(`Courier configuration for ${courierCode} not found`);
  }

  const adapter = getCourierAdapter(courierCode);
  const trackingResult = await adapter.checkStatus(
    courierConfig as any,
    shipment.trackingNumber || shipment.consignmentId
  );

  // Automatically sync status in database if changed
  const statusToApply = trackingResult.rawStatus || trackingResult.status;
  if (statusToApply) {
    await applyShipmentCourierStatusUpdate(
      shipment.id,
      statusToApply,
      trackingResult.rawResponse
    );
  }

  const refreshedShipment: any = await db.orm.public.Shipment.first({ id: shipment.id });

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
