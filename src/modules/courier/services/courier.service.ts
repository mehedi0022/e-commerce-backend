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

  // Update shipment status if courier status changed
  if (trackingResult.rawStatus && trackingResult.rawStatus !== shipment.courierStatus) {
    await db.orm.public.Shipment.where({ id: shipment.id }).update({
      courierStatus: trackingResult.rawStatus,
      updatedAt: Temporal.Now.instant(),
    });
  }

  return {
    orderNumber,
    courierName: shipment.courierName,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    consignmentId: shipment.consignmentId,
    codAmount: shipment.codAmount,
    status: trackingResult.status,
    rawStatus: trackingResult.rawStatus,
    rawResponse: trackingResult.rawResponse,
  };
};
