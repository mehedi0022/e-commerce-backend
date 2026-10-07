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
import { triggerNotification } from "../../sms/services/notification-trigger.service.js";
import type { OrderListQuery } from "../order.types.js";

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const orderNumber = (id: number) => `ORD-${id}`;
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
  // Resolve payment method configuration
  const paymentMethodCode =
    input.paymentMethodCode ||
    (input.paymentMethod === "CASH_ON_DELIVERY" ? "cod" : "bkash_manual");
  const paymentConfig: any = await db.orm.public.PaymentMethodConfig.first({
    code: paymentMethodCode,
  });

  const isCOD =
    paymentConfig?.type === "COD" ||
    input.paymentMethod === "CASH_ON_DELIVERY" ||
    paymentMethodCode === "cod";
  const isManualPayment =
    paymentConfig &&
    (paymentConfig.type === "MANUAL_MFS" ||
      paymentConfig.type === "MANUAL_BANK");

  if (!isCOD && !isManualPayment) {
    if (paymentConfig?.type === "AUTOMATED_GATEWAY") {
      if (!paymentConfig.isActive) {
        throw new ConflictError(
          "Selected payment gateway is currently unavailable",
        );
      }
    } else {
      throw new ConflictError(
        "Selected payment method is currently unavailable",
      );
    }
  }

  if (isManualPayment) {
    if (!input.transactionId || !input.transactionId.trim()) {
      throw new ValidationError(
        "Transaction ID (TrxID) is required for manual payment",
      );
    }
  }

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

  // 1. Free Shipping Check: Applies to standard/regular delivery if all products qualify or subtotal meets threshold
  const isAllFreeShipping =
    items.length > 0 &&
    items.every((x: any) => Boolean(x.v.product?.isFreeShipping));

  const isExpressMethod =
    method.method?.code?.toUpperCase().includes("EXPRESS") || false;
  const subtotalNum = Number(subtotal);
  const thresholdNum =
    method.freeShippingThreshold != null
      ? Number(method.freeShippingThreshold)
      : null;
  const isFreeEligible =
    (!isExpressMethod && isAllFreeShipping) ||
    (thresholdNum !== null && subtotalNum >= thresholdNum) ||
    Number(method.charge) === 0;

  const shippingCharge = isFreeEligible ? "0.00" : String(method.charge);

  // 2. Minimum Advance Payment / Partial COD Check
  const anyRequiresAdvance = items.some((x: any) =>
    Boolean(x.v.product?.requiresAdvancePayment),
  );
  const anyCodDisabled = items.some(
    (x: any) => x.v.product?.isCodAvailable === false,
  );

  let advanceRequiredAmount = 0;
  if (anyRequiresAdvance) {
    for (const x of items) {
      if (x.v.product?.requiresAdvancePayment) {
        const perProductAdvance =
          Number(x.v.product?.advancePaymentAmount) > 0
            ? Number(x.v.product?.advancePaymentAmount)
            : Number(shippingCharge) > 0
              ? Number(shippingCharge)
              : 100;
        advanceRequiredAmount += perProductAdvance;
      }
    }
  } else if (anyCodDisabled) {
    advanceRequiredAmount =
      Number(shippingCharge) > 0 ? Number(shippingCharge) : 100;
  }

  const isAdvanceRequired = advanceRequiredAmount > 0;

  // If customer chose COD but advance is strictly required without payment details
  if (
    isCOD &&
    isAdvanceRequired &&
    !input.transactionId &&
    paymentConfig?.type === "COD"
  ) {
    throw new ValidationError(
      `Full Cash on Delivery is unavailable. A minimum advance payment of ৳${advanceRequiredAmount.toFixed(
        2,
      )} is required for this order. Remaining balance will be Cash on Delivery.`,
    );
  }

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

    const grandTotalNum = Number(grandTotal);
    const isPayingFull = Boolean(input.paidInFull) || !isAdvanceRequired;

    let advanceAmountNum = 0;
    let dueAmountNum = 0;
    let orderPaymentMethod = "ONLINE";
    let orderIsAdvanceRequired = false;

    if (isCOD) {
      advanceAmountNum = 0;
      dueAmountNum = grandTotalNum;
      orderPaymentMethod = "CASH_ON_DELIVERY";
      orderIsAdvanceRequired = false;
    } else if (isAdvanceRequired && !isPayingFull) {
      // Customer chose to pay minimum advance online/MFS
      advanceAmountNum = Math.min(advanceRequiredAmount, grandTotalNum);
      dueAmountNum = Math.max(0, grandTotalNum - advanceAmountNum);
      if (dueAmountNum > 0) {
        orderPaymentMethod = "PARTIAL_COD";
        orderIsAdvanceRequired = true;
      } else {
        // Full order is covered
        orderPaymentMethod = "ONLINE";
        orderIsAdvanceRequired = false;
      }
    } else {
      // Customer chose to pay full amount online (or advance was not required)
      advanceAmountNum = grandTotalNum;
      dueAmountNum = 0;
      orderPaymentMethod = "ONLINE";
      orderIsAdvanceRequired = false;
    }

    const advanceAmount = advanceAmountNum.toFixed(2);
    const dueAmount = dueAmountNum.toFixed(2);
    const paymentStatus = isCOD ? "UNPAID" : "PENDING";

    for (const x of items)
      await inventory.reserveStock(x.v.id, x.item.quantity, tx);

    const order = await repo.create(tx, {
      orderNumber: "TEMP",
      userId: userId ?? null,
      customerName,
      customerEmail: customerEmail ?? null,
      customerPhone,
      status: "PENDING",
      paymentMethod: orderPaymentMethod,
      paymentStatus,
      couponId: appliedCoupon?.coupon.id ?? null,
      couponCode: appliedCoupon?.normalizedCode ?? null,
      subtotal,
      shippingCharge,
      discountAmount,
      taxAmount: "0.00",
      grandTotal,
      advanceAmount,
      dueAmount,
      isAdvanceRequired: orderIsAdvanceRequired,
      isFreeShipping: isFreeEligible,
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

    const finalOrderNumber = `ORD-${1000 + parseInt(order.id)}`;
    await repo.update(tx, order.id, { orderNumber: finalOrderNumber });
    order.orderNumber = finalOrderNumber;

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

    const transactionAmount = orderIsAdvanceRequired
      ? advanceAmount
      : grandTotal;

    if (isManualPayment && paymentConfig) {
      await tx.orm.public.OrderPaymentTransaction.create({
        orderId: order.id,
        paymentMethodCode: paymentConfig.code,
        paymentMethodConfigId: paymentConfig.id,
        type: paymentConfig.type,
        senderNumber: input.senderNumber || null,
        transactionId: input.transactionId.trim(),
        amount: transactionAmount,
        status: "PENDING_VERIFICATION",
      });
    } else if (paymentConfig?.type === "AUTOMATED_GATEWAY") {
      await tx.orm.public.OrderPaymentTransaction.create({
        orderId: order.id,
        paymentMethodCode: paymentConfig.code,
        paymentMethodConfigId: paymentConfig.id,
        type: paymentConfig.type,
        amount: transactionAmount,
        status: "PENDING_VERIFICATION",
        gatewayPayload: {
          cartId: cart.id,
          guestToken: guestToken || null,
        },
      });
    }

    const initialHistoryNote = isAdvanceRequired
      ? `Order placed with Partial COD. Required advance: ৳${advanceAmount} (Method: ${paymentConfig?.name || "MFS"}, TrxID: ${input.transactionId ? input.transactionId.trim() : "N/A"}). Due on Delivery: ৳${dueAmount}`
      : isManualPayment && paymentConfig
        ? `Order placed via ${paymentConfig.name}. Sender: ${input.senderNumber || "N/A"}, TrxID: ${input.transactionId.trim()}`
        : paymentConfig?.type === "AUTOMATED_GATEWAY"
          ? `Order initiated via automated gateway: ${paymentConfig.name}`
          : "Order placed via Cash on Delivery";

    await repo.history(tx, {
      orderId: order.id,
      fromStatus: null,
      toStatus: "PENDING",
      note: initialHistoryNote,
      changedById: userId ?? null,
    });
    if (appliedCoupon)
      await repo.couponUsage(tx, {
        couponId: appliedCoupon.coupon.id,
        orderId: order.id,
        userId: userId ?? null,
      });

    const isAutomatedGateway = paymentConfig?.type === "AUTOMATED_GATEWAY";

    // For automated gateways, do NOT convert/empty cart yet; cart is converted only when payment succeeds
    if (!isAutomatedGateway) {
      const converted = await tx.orm.public.Cart.where({
        id: cart.id,
        status: "ACTIVE",
      })
        .select("id")
        .update({ status: "CONVERTED" });
      if (!converted)
        throw new ConflictError("Cart has already been checked out");
    }

    return order;
  });
  const safe = {
    id: result.id,
    orderNumber: result.orderNumber,
    status: result.status,
    paymentMethod: result.paymentMethod,
    paymentStatus: result.paymentStatus,
    paymentMethodCode: paymentConfig?.code || "cod",
    paymentMethodType: paymentConfig?.type || "COD",
    subtotal: String(result.subtotal),
    shippingCharge: String(result.shippingCharge),
    discountAmount: String(result.discountAmount),
    taxAmount: String(result.taxAmount),
    grandTotal: String(result.grandTotal),
    advanceAmount: String(result.advanceAmount),
    dueAmount: String(result.dueAmount),
    isAdvanceRequired: Boolean(result.isAdvanceRequired),
    isFreeShipping: Boolean(result.isFreeShipping),
    ...(accessToken ? { guestAccessToken: accessToken } : {}),
  };

  // Trigger event notification (SMS & Email) asynchronously only if order is finalized (non-automated gateway)
  if (paymentConfig?.type !== "AUTOMATED_GATEWAY") {
    void triggerNotification("ORDER_PLACED", {
      orderId: result.id,
      orderNumber: result.orderNumber,
      customerName: ship.fullName,
      customerPhone: ship.phone,
      grandTotal: String(result.grandTotal),
      advanceAmount: String(result.advanceAmount),
      dueAmount: String(result.dueAmount),
      paymentMethod: paymentConfig?.name || result.paymentMethod,
    });
  }

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
    cancelledAt: order.cancelledAt,
    customerName: order.customerName,
    itemCount: order.items?.length || 0,
    grandTotal: String(order.grandTotal),
    advanceAmount: String(order.advanceAmount ?? "0.00"),
    dueAmount: String(order.dueAmount ?? order.grandTotal),
    isAdvanceRequired: Boolean(order.isAdvanceRequired),
    isFreeShipping: Boolean(order.isFreeShipping),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
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
      productSlug: i.productSlug,
      imageUrl: i.product?.images?.[0]?.imageUrl ?? null,
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
  const orderResult = await db.transaction(async (tx: any) => {
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
        (current.paymentMethod === "CASH_ON_DELIVERY" ||
          current.paymentMethod === "PARTIAL_COD") &&
        (current.paymentStatus === "UNPAID" ||
          current.paymentStatus === "PARTIALLY_PAID")
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

  if (toStatus === "SHIPPED") {
    void triggerNotification("ORDER_SHIPPED", {
      orderId: current.id,
      orderNumber: current.orderNumber,
    });
  } else if (toStatus === "DELIVERED") {
    void triggerNotification("ORDER_DELIVERED", {
      orderId: current.id,
      orderNumber: current.orderNumber,
    });
  }

  return orderResult;
};

export const updateAdmin = async (number: string, data: any) => {
  const current: any = await repo.findByNumber(number);
  if (!current) throw new NotFoundError("Order not found");
  return db.transaction(async (tx: any) => {
    return repo.update(tx, current.id, data);
  });
};
