import { createHash, randomBytes } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../errors/AppError.js";
import { moneyMultiply, moneySum } from "../../../utils/money.util.js";
import * as cartRepo from "../../cart/repositories/cart.repository.js";
import * as shipping from "../../shipping/services/shipping.service.js";
import * as repo from "../repositories/order.repository.js";
import * as couponService from "../../coupon/services/coupon.service.js";
import * as inventory from "../../inventory/services/inventory.service.js";
import type { OrderListQuery } from "../order.types.js";

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const orderNumber = () =>
  `ORD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}-${randomBytes(2).toString("hex")}`;
const available = (v: any) =>
  (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0);
const snapshotAddress = (x: any, type: string, orderId: number) => ({
  orderId,
  type,
  fullName: x.fullName,
  phone: x.phone,
  addressLine1: x.addressLine1,
  addressLine2: x.addressLine2 ?? null,
  divisionId: x.divisionId ?? null,
  districtId: x.districtId ?? null,
  upazilaId: x.upazilaId ?? null,
  unionId: x.unionId ?? null,
  division: x.division ?? null,
  district: x.district,
  upazila: x.upazila ?? null,
  thana: x.thana ?? null,
  area: x.area ?? null,
  postalCode: x.postalCode ?? null,
  countryCode: String(x.countryCode ?? "BD").toUpperCase(),
});

const cartWithItems = async (userId?: number, guestToken?: string) =>
  userId
    ? cartRepo.findUserCart(userId)
    : guestToken
      ? cartRepo.findGuestCart(guestToken)
      : null;
const selectMethod = async (zoneId: number, methodId: number) => {
  const options = await (
    await import("../../shipping/repositories/shipping.repository.js")
  ).zoneOptions(zoneId);
  const selected = options.find(
    (x: any) => x.methodId === methodId && x.isActive && x.method.isActive,
  );
  if (!selected)
    throw new ConflictError(
      "Selected shipping method is not available for this address",
    );
  return selected;
};

export const commitOrderFulfillment = async (
  tx: any,
  orderId: number,
  orderNumber: string,
) => {
  const items: any[] = await tx.orm.public.OrderItem.select(
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
    if (!item.variantId)
      throw new ConflictError("Order item has no fulfillable variant");
    await inventory.commitReservedStock(
      item.variantId,
      item.quantity,
      { referenceType: "ORDER", referenceId: orderNumber },
      tx,
    );
  }
};

export const checkout = async (
  input: any,
  userId?: number,
  guestToken?: string,
) => {
  if (input.paymentMethod !== "CASH_ON_DELIVERY")
    throw new ConflictError("Online payment is not available");
  const cart: any = await cartWithItems(userId, guestToken);
  if (!cart || cart.status !== "ACTIVE" || !cart.items.length)
    throw new ValidationError("Cart is empty");
  let ship: any;
  let bill: any;
  if (userId) {
    ship = await shipping.getAddress(userId, input.shippingAddressId);
    bill = input.billingSameAsShipping
      ? ship
      : await shipping.getAddress(userId, input.billingAddressId);
  } else {
    ship = input.shippingAddress;
    bill = input.billingSameAsShipping ? ship : input.billingAddress;
  }
  const zone: any = await shipping.resolveZone(ship);
  const method: any = await selectMethod(zone.id, input.shippingMethodId);
  const items = cart.items.map((item: any) => {
    const v = item.variant;
    if (
      !v ||
      !v.isActive ||
      v.product?.status !== "ACTIVE" ||
      !v.inventory ||
      item.quantity <= 0 ||
      item.quantity > available(v)
    )
      throw new ConflictError(
        `Insufficient stock or unavailable product for ${v?.sku ?? item.variantId}`,
      );
    const unitPrice = String(v.price);
    return {
      item,
      v,
      unitPrice,
      lineTotal: moneyMultiply(unitPrice, item.quantity),
    };
  });
  const subtotal = moneySum(items.map((x: any) => x.lineTotal));
  if (input.couponCode)
    await couponService.validateAndCalculate(
      input.couponCode,
      subtotal,
      userId,
    );
  const shippingCharge = String(method.charge);
  const accessToken = userId ? undefined : randomBytes(32).toString("hex");
  const customerName = userId ? ship.fullName : input.customer.name;
  const customerPhone = userId ? ship.phone : input.customer.phone;
  const customerEmail = userId
    ? (await db.orm.public.User.select("email").first({ id: userId }))?.email
    : input.customer.email;
  const result = await db.transaction(async (tx: any) => {
    const appliedCoupon: any = input.couponCode
      ? await couponService.validateAndCalculateInTransaction(
          tx,
          input.couponCode,
          subtotal,
          userId,
        )
      : null;
    const discountAmount = appliedCoupon?.discountAmount ?? "0.00";
    const grandTotal = moneySum([
      subtotal,
      shippingCharge,
      `-${discountAmount}`,
    ]);
    for (const x of items)
      await inventory.reserveStock(x.v.id, x.item.quantity, tx);
    const order = await repo.create(tx, {
      orderNumber: orderNumber(),
      userId: userId ?? null,
      customerName,
      customerEmail: customerEmail ?? null,
      customerPhone,
      status: "PENDING",
      paymentMethod: input.paymentMethod,
      paymentStatus: "UNPAID",
      couponId: appliedCoupon?.coupon.id ?? null,
      couponCode: appliedCoupon?.normalizedCode ?? null,
      subtotal,
      shippingCharge,
      discountAmount,
      taxAmount: "0.00",
      grandTotal,
      shippingZoneId: zone.id,
      shippingMethodId: method.methodId,
      shippingZoneName: zone.name,
      shippingMethodName: method.method.name,
      customerNote: input.customerNote ?? null,
      guestAccessTokenHash: accessToken ? tokenHash(accessToken) : null,
      guestAccessTokenExpiresAt: accessToken
        ? Temporal.Instant.fromEpochMilliseconds(Date.now() + 30 * 86400000)
        : null,
    });
    for (const x of items) {
      const oi = await repo.item(tx, {
        orderId: order.id,
        productId: x.v.productId,
        variantId: x.v.id,
        productName: x.v.product.name,
        productSlug: x.v.product.slug,
        sku: x.v.sku,
        quantity: x.item.quantity,
        unitPrice: x.unitPrice,
        lineTotal: x.lineTotal,
      });
      for (const av of x.v.attributeValues ?? [])
        await repo.itemAttribute(tx, {
          orderItemId: oi.id,
          attributeName: av.attributeValue.attribute.name,
          attributeValue: av.attributeValue.value,
        });
    }
    await repo.address(tx, snapshotAddress(ship, "SHIPPING", order.id));
    await repo.address(tx, snapshotAddress(bill, "BILLING", order.id));
    await repo.history(tx, {
      orderId: order.id,
      fromStatus: null,
      toStatus: "PENDING",
      note: null,
      changedById: userId ?? null,
    });
    if (appliedCoupon)
      await repo.couponUsage(tx, {
        couponId: appliedCoupon.coupon.id,
        orderId: order.id,
        userId: userId ?? null,
      });
    const converted = await tx.orm.public.Cart.where({
      id: cart.id,
      status: "ACTIVE",
    })
      .select("id")
      .update({ status: "CONVERTED" });
    if (!converted)
      throw new ConflictError("Cart has already been checked out");
    return order;
  });
  const safe = {
    orderNumber: result.orderNumber,
    status: result.status,
    paymentMethod: result.paymentMethod,
    paymentStatus: result.paymentStatus,
    subtotal: String(result.subtotal),
    shippingCharge: String(result.shippingCharge),
    discountAmount: String(result.discountAmount),
    taxAmount: String(result.taxAmount),
    grandTotal: String(result.grandTotal),
    ...(accessToken ? { guestAccessToken: accessToken } : {}),
  };
  return safe;
};

export const customerList = (userId: number, query: OrderListQuery) =>
  repo.list({ ...query, userId });
export const adminList = (query: OrderListQuery) => repo.list(query);
const isGuestExpired = (exp: any) => {
  if (!exp) return true;
  const ms =
    typeof exp?.epochMilliseconds === "number"
      ? exp.epochMilliseconds
      : new Date(exp).getTime();
  return ms < Date.now();
};
export const detail = async (
  number: string,
  userId?: number,
  accessToken?: string,
) => {
  const x: any = userId
    ? await repo.findByNumber(number)
    : accessToken
      ? await repo.findGuest(number, tokenHash(accessToken))
      : null;
  if (
    !x ||
    (userId && x.userId !== userId) ||
    (!userId &&
      (!x.guestAccessTokenExpiresAt ||
        isGuestExpired(x.guestAccessTokenExpiresAt)))
  )
    throw new NotFoundError("Order not found");
  return x;
};
export const trackOrder = async (orderNumber: string, phone?: string) => {
  const normalizedNumber = orderNumber.trim();
  const order: any = await repo.findByNumber(normalizedNumber);
  if (!order) throw new NotFoundError("No order found with this order number");

  if (phone) {
    const cleanPhone = phone.trim().replace(/[\s-]/g, "");
    const orderPhone = (order.customerPhone || "").replace(/[\s-]/g, "");
    if (!orderPhone.includes(cleanPhone) && !cleanPhone.includes(orderPhone)) {
      throw new NotFoundError("Order number and phone number do not match");
    }
  }

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.placedAt ?? order.createdAt,
    confirmedAt: order.confirmedAt,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    customerName: order.customerName,
    itemCount: order.items?.length || 0,
    grandTotal: String(order.grandTotal),
    shippingMethodName: order.shippingMethodName,
    shippingZoneName: order.shippingZoneName,
    shipment: order.shipment
      ? {
          status: order.shipment.status,
          courierName: order.shipment.courierName,
          trackingNumber: order.shipment.trackingNumber,
          trackingUrl: order.shipment.trackingUrl,
          shippedAt: order.shipment.shippedAt,
          deliveredAt: order.shipment.deliveredAt,
        }
      : null,
    items: (order.items || []).map((i: any) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: String(i.unitPrice),
      lineTotal: String(i.lineTotal),
      attributes: i.attributes || [],
    })),
    deliveryDistrict:
      order.addresses?.find((a: any) => a.type === "SHIPPING")?.district ||
      "Bangladesh",
  };
};

export const transition = async (
  number: string,
  toStatus: string,
  changedById: number,
  note?: string,
) => {
  const current: any = await repo.findByNumber(number);
  if (!current) throw new NotFoundError("Order not found");
  const allowed: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED", "CANCELLED"],
    DELIVERED: [],
    CANCELLED: [],
  };
  if (!allowed[current.status]?.includes(toStatus)) {
    throw new ConflictError(
      `Cannot move order from ${current.status} to ${toStatus}`,
    );
  }
  return db.transaction(async (tx: any) => {
    if (toStatus === "CANCELLED") {
      for (const item of current.items) {
        if (!item.variantId) continue;
        await inventory.releaseStock(item.variantId, item.quantity, tx, {
          referenceType: "ORDER",
          referenceId: current.orderNumber,
        });
      }
    }
    const now = Temporal.Now.instant();
    if (toStatus === "SHIPPED") {
      if (!current.shippedAt) {
        await commitOrderFulfillment(tx, current.id, current.orderNumber);
      }
      const ship: any = await tx.orm.public.Shipment.select(
        "id",
        "status",
      ).first({ orderId: current.id });
      if (ship && ["PENDING", "READY_TO_SHIP"].includes(ship.status)) {
        await tx.orm.public.Shipment.where({ id: ship.id })
          .select("id")
          .update({
            status: "SHIPPED",
            shippedAt: now,
          });
        await tx.orm.public.ShipmentStatusHistory.create({
          shipmentId: ship.id,
          fromStatus: ship.status,
          toStatus: "SHIPPED",
          changedById,
          note: note ?? null,
        });
      }
    }
    const data: any = { status: toStatus };
    if (toStatus === "CONFIRMED") data.confirmedAt = now;
    if (toStatus === "SHIPPED") data.shippedAt = now;
    if (toStatus === "DELIVERED") {
      data.deliveredAt = now;
      if (
        current.paymentMethod === "CASH_ON_DELIVERY" &&
        current.paymentStatus === "UNPAID"
      ) {
        data.paymentStatus = "PAID";
      }
      const ship: any = await tx.orm.public.Shipment.select(
        "id",
        "status",
      ).first({ orderId: current.id });
      if (
        ship &&
        [
          "PENDING",
          "READY_TO_SHIP",
          "SHIPPED",
          "IN_TRANSIT",
          "OUT_FOR_DELIVERY",
        ].includes(ship.status)
      ) {
        await tx.orm.public.Shipment.where({ id: ship.id })
          .select("id")
          .update({
            status: "DELIVERED",
            deliveredAt: now,
          });
        await tx.orm.public.ShipmentStatusHistory.create({
          shipmentId: ship.id,
          fromStatus: ship.status,
          toStatus: "DELIVERED",
          changedById,
          note: note ?? null,
        });
      }
    }
    if (toStatus === "CANCELLED") data.cancelledAt = now;
    const updated = await repo.update(tx, current.id, data);
    await repo.history(tx, {
      orderId: current.id,
      fromStatus: current.status,
      toStatus,
      note: note ?? null,
      changedById,
    });
    return updated;
  });
};

export const updateAdmin = async (number: string, data: any) => {
  const current: any = await repo.findByNumber(number);
  if (!current) throw new NotFoundError("Order not found");
  return db.transaction(async (tx: any) => {
    return repo.update(tx, current.id, data);
  });
};
