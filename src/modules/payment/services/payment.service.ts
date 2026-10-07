import { Temporal } from "temporal-polyfill";
import * as repo from "../repositories/payment.repository.js";
import { NotFoundError, ConflictError, ValidationError } from "../../../errors/AppError.js";
import { db } from "../../../prisma/db.js";
import { getPaymentAdapter } from "../gateways/gateway.factory.js";
import { triggerNotification } from "../../sms/services/notification-trigger.service.js";
import * as inventory from "../../inventory/services/inventory.service.js";
import { config as appConfig } from "../../../config/env.js";
import type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
  VerifyPaymentInput,
} from "../payment.types.js";

export const getPublicMethods = async () => {
  return repo.findPublicMethods();
};

export const getAdminMethods = async () => {
  return repo.findAllMethods();
};

export const getMethodById = async (id: number) => {
  const method = await repo.findById(id);
  if (!method) throw new NotFoundError("Payment method not found");
  return method;
};

export const createMethod = async (data: CreatePaymentMethodInput) => {
  const existing = await repo.findByCode(data.code);
  if (existing) {
    throw new ConflictError(`Payment method with code "${data.code}" already exists`);
  }
  return repo.createMethod(data);
};

export const updateMethod = async (
  id: number,
  data: UpdatePaymentMethodInput,
) => {
  await getMethodById(id);
  return repo.updateMethod(id, data);
};

export const deleteMethod = async (id: number) => {
  await getMethodById(id);
  return repo.deleteMethod(id);
};

export const getOrderTransactions = async (orderId: number) => {
  const order = await db.orm.public.Order.first({ id: orderId });
  if (!order) throw new NotFoundError("Order not found");
  return repo.findTransactionsByOrderId(orderId);
};

export const verifyTransaction = async (
  transactionId: number,
  input: VerifyPaymentInput,
  adminUserId: number,
) => {
  const transaction = await repo.findTransactionById(transactionId);
  if (!transaction) throw new NotFoundError("Payment transaction not found");

  const order = await db.orm.public.Order.first({ id: transaction.orderId });
  if (!order) throw new NotFoundError("Order not found");

  const verifyResult = await db.transaction(async (tx: any) => {
    const updatedTransaction = await repo.updateTransactionVerification(
      tx,
      transactionId,
      input.status,
      adminUserId,
      input.adminNote,
    );

    if (input.status === "VERIFIED") {
      const nextPaymentStatus =
        order.isAdvanceRequired && Number(order.dueAmount) > 0
          ? "PARTIALLY_PAID"
          : "PAID";

      await tx.orm.public.Order.where({ id: order.id }).update({
        paymentStatus: nextPaymentStatus,
      });

      const noteText = `Payment verified by admin (${nextPaymentStatus}). Method: ${transaction.paymentMethodCode}, TrxID: ${
        transaction.transactionId || "N/A"
      }${input.adminNote ? `. Note: ${input.adminNote}` : ""}`;

      await tx.orm.public.OrderStatusHistory.create({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        note: noteText,
        changedById: adminUserId,
      });
    } else if (input.status === "REJECTED") {
      await tx.orm.public.Order.where({ id: order.id }).update({
        paymentStatus: "FAILED",
      });

      const noteText = `Payment verification rejected by admin. TrxID: ${
        transaction.transactionId || "N/A"
      }${input.adminNote ? `. Reason: ${input.adminNote}` : ""}`;

      await tx.orm.public.OrderStatusHistory.create({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        note: noteText,
        changedById: adminUserId,
      });
    }

    return updatedTransaction;
  });

  if (input.status === "VERIFIED") {
    void triggerNotification("PAYMENT_VERIFIED", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      trxId: transaction.transactionId || "",
      amount: String(transaction.amount || order.grandTotal),
      paymentMethod: transaction.paymentMethodCode,
    });
  }

  return verifyResult;
};

// ─── Automated Gateway Methods (Phase 5) ────────────────────────────────────

export const initiateGatewayPayment = async (orderId: number) => {
  const order = await db.orm.public.Order.first({ id: orderId });
  if (!order) throw new NotFoundError("Order not found");

  if (order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_PAID") {
    throw new ConflictError("Order payment is already completed or partially paid");
  }

  // Find transaction with paymentMethodConfig
  const transaction = await db.orm.public.OrderPaymentTransaction
    .where({ orderId })
    .orderBy((t: any) => t.createdAt.desc())
    .first();

  if (!transaction) {
    throw new NotFoundError("No payment transaction record found for this order");
  }

  const paymentConfig = await repo.findByCode(transaction.paymentMethodCode);
  if (!paymentConfig || paymentConfig.type !== "AUTOMATED_GATEWAY") {
    throw new ValidationError("Selected payment method is not an automated gateway");
  }

  if (!paymentConfig.isActive) {
    throw new ConflictError("Payment gateway is currently deactivated");
  }

  const adapter = getPaymentAdapter(paymentConfig as any);

  // Address
  const shippingAddress = await db.orm.public.OrderAddress
    .where({ orderId, type: "SHIPPING" })
    .first();

  const frontendUrl =
    (appConfig.cors.origins && appConfig.cors.origins[0]) || "http://localhost:3000";
  const backendBaseUrl = `http://localhost:${appConfig.port}/api/v1`;

  const callbackUrls = {
    successUrl: `${backendBaseUrl}/payments/gateway/${paymentConfig.code}/callback?orderId=${order.id}&status=success`,
    failUrl: `${backendBaseUrl}/payments/gateway/${paymentConfig.code}/callback?orderId=${order.id}&status=fail`,
    cancelUrl: `${backendBaseUrl}/payments/gateway/${paymentConfig.code}/callback?orderId=${order.id}&status=cancel`,
    ipnUrl: `${backendBaseUrl}/payments/gateway/${paymentConfig.code}/ipn?orderId=${order.id}`,
  };

  const payableAmount = transaction.amount || order.grandTotal;

  const result = await adapter.initiatePayment(paymentConfig as any, {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      grandTotal: order.grandTotal,
      payableAmount,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
    },
    shippingAddress: shippingAddress
      ? {
          addressLine1: shippingAddress.addressLine1,
          district: shippingAddress.district,
          postalCode: shippingAddress.postalCode,
        }
      : null,
    callbackUrls,
  });

  // Update transaction with session key and payload without erasing cartId info
  const existingPayload =
    typeof transaction.gatewayPayload === "object" && transaction.gatewayPayload
      ? (transaction.gatewayPayload as any)
      : {};
  await db.orm.public.OrderPaymentTransaction.where({ id: transaction.id }).update({
    transactionId: result.transactionId || transaction.transactionId,
    gatewayPayload: {
      ...existingPayload,
      sessionKey: result.sessionKey || null,
    },
    gatewayResponse: result.gatewayResponse || null,
  });

  return result;
};

const cleanupUnplacedGatewayOrder = async (
  orderId: number,
  orderNumber: string,
  reason: string,
) => {
  await db.transaction(async (tx: any) => {
    const orderItems: any[] = await tx.orm.public.OrderItem
      .select("id", "variantId", "quantity")
      .where({ orderId })
      .all();

    for (const item of orderItems) {
      if (item.variantId) {
        await inventory.releaseStock(item.variantId, item.quantity, tx, {
          referenceType: reason,
          referenceId: orderNumber,
        });
      }
    }

    await tx.orm.public.OrderPaymentTransaction.where({ orderId }).delete();
    await tx.orm.public.OrderStatusHistory.where({ orderId }).delete();
    await tx.orm.public.OrderAddress.where({ orderId }).delete();
    await tx.orm.public.CouponUsage.where({ orderId }).delete();
    for (const item of orderItems) {
      await tx.orm.public.OrderItemAttribute.where({ orderItemId: item.id }).delete();
    }
    await tx.orm.public.OrderItem.where({ orderId }).delete();
    await tx.orm.public.Order.where({ id: orderId }).delete();
  });
};

export const handleGatewayCallback = async (
  gatewayCode: string,
  query: any,
  body: any,
) => {
  let orderId = Number(query.orderId || body?.orderId);
  const statusParam = String(query.status || body?.status || "").toLowerCase();

  let order: any = null;
  if (orderId) {
    order = await db.orm.public.Order.first({ id: orderId });
  } else if (body?.tran_id || query?.tran_id) {
    const rawTranId = String(body?.tran_id || query?.tran_id);
    const orderNum = rawTranId.includes("_") ? rawTranId.split("_")[0] : rawTranId;
    order = await db.orm.public.Order.first({ orderNumber: orderNum });
    if (order) orderId = order.id;
  }

  if (!order) throw new NotFoundError("Order not found");

  const paymentConfig = await repo.findByCode(gatewayCode);
  if (!paymentConfig) throw new NotFoundError("Payment gateway configuration not found");

  const transaction = await db.orm.public.OrderPaymentTransaction
    .where({ orderId: order.id })
    .orderBy((t: any) => t.createdAt.desc())
    .first();

  const frontendUrl =
    (appConfig.cors.origins && appConfig.cors.origins[0]) || "http://localhost:3000";

  // If already paid, redirect straight to order-success
  if (order.paymentStatus === "PAID") {
    return { redirectUrl: `${frontendUrl}/order-success/${order.orderNumber}` };
  }

  const isCancelled = statusParam === "cancel" || statusParam === "cancelled";
  const isFailed =
    statusParam === "fail" ||
    statusParam === "failure" ||
    statusParam === "failed";

  // If customer cancelled or payment failed on gateway portal:
  // Release reserved stock, purge unconfirmed order, and send customer back to checkout with cart intact
  if (isCancelled || isFailed) {
    await cleanupUnplacedGatewayOrder(
      order.id,
      order.orderNumber,
      isCancelled ? "ORDER_PAYMENT_CANCELLED" : "ORDER_PAYMENT_FAILED",
    );
    const param = isCancelled ? "cancelled" : "failed";
    return {
      redirectUrl: `${frontendUrl}/checkout?payment=${param}`,
    };
  }

  // Verify through adapter
  const adapter = getPaymentAdapter(paymentConfig as any);
  const verifyResult = await adapter.verifyPayment(paymentConfig as any, {
    transactionId: transaction?.transactionId || undefined,
    payload: { ...query, ...body },
  });

  if (!verifyResult.isValid) {
    // Gateway validation rejected: release stock, purge order, return customer to checkout
    await cleanupUnplacedGatewayOrder(
      order.id,
      order.orderNumber,
      "ORDER_PAYMENT_REJECTED",
    );
    return {
      redirectUrl: `${frontendUrl}/checkout?payment=failed`,
    };
  }

  // Gateway payment is VALID: confirm order, convert cart, send notification
  await db.transaction(async (tx: any) => {
    if (transaction) {
      await tx.orm.public.OrderPaymentTransaction.where({ id: transaction.id }).update({
        status: "VERIFIED",
        transactionId: verifyResult.transactionId || transaction.transactionId,
        gatewayResponse: verifyResult.rawResponse,
        verifiedAt: Temporal.Now.instant(),
        adminNote: `Verified automatically via ${paymentConfig.name}`,
      });
    }

    const nextPaymentStatus =
      order.isAdvanceRequired && Number(order.dueAmount) > 0
        ? "PARTIALLY_PAID"
        : "PAID";

    await tx.orm.public.Order.where({ id: order.id }).update({
      status: "CONFIRMED",
      confirmedAt: Temporal.Now.instant(),
      paymentStatus: nextPaymentStatus,
    });

    await tx.orm.public.OrderStatusHistory.create({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: "CONFIRMED",
      note: `Payment successfully completed via ${paymentConfig.name} (${nextPaymentStatus}). TrxID: ${verifyResult.transactionId}`,
    });

    // NOW convert the cart into CONVERTED state
    const rawPayload = transaction?.gatewayPayload as any;
    const cartId = rawPayload?.cartId;
    if (cartId) {
      await tx.orm.public.Cart.where({ id: cartId, status: "ACTIVE" }).update({
        status: "CONVERTED",
      });
    } else if (order.userId) {
      await tx.orm.public.Cart.where({ userId: order.userId, status: "ACTIVE" }).update({
        status: "CONVERTED",
      });
    } else if (rawPayload?.guestToken) {
      await tx.orm.public.Cart.where({ guestToken: rawPayload.guestToken, status: "ACTIVE" }).update({
        status: "CONVERTED",
      });
    }
  });

  // Trigger event notifications
  void triggerNotification("ORDER_PLACED", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    grandTotal: String(order.grandTotal),
    advanceAmount: String(order.advanceAmount),
    dueAmount: String(order.dueAmount),
    paymentMethod: paymentConfig.name,
  });

  void triggerNotification("PAYMENT_VERIFIED", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    trxId: verifyResult.transactionId || transaction?.transactionId || "",
    amount: String(transaction?.amount || order.grandTotal),
    paymentMethod: paymentConfig.name,
  });

  return { redirectUrl: `${frontendUrl}/order-success/${order.orderNumber}?payment=success` };
};
