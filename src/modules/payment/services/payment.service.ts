import * as repo from "../repositories/payment.repository.js";
import { NotFoundError, ConflictError, ValidationError } from "../../../errors/AppError.js";
import { db } from "../../../prisma/db.js";
import { getPaymentAdapter } from "../gateways/gateway.factory.js";
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

  return db.transaction(async (tx: any) => {
    const updatedTransaction = await repo.updateTransactionVerification(
      tx,
      transactionId,
      input.status,
      adminUserId,
      input.adminNote,
    );

    if (input.status === "VERIFIED") {
      await tx.orm.public.Order.where({ id: order.id }).update({
        paymentStatus: "PAID",
      });

      const noteText = `Payment verified by admin. Method: ${transaction.paymentMethodCode}, TrxID: ${
        transaction.transactionId || "N/A"
      }${input.adminNote ? `. Note: ${input.adminNote}` : ""}`;

      await tx.orm.public.OrderStatusHistory.create({
        orderId: order.id,
        status: order.status,
        note: noteText,
        changedByUserId: adminUserId,
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
        status: order.status,
        note: noteText,
        changedByUserId: adminUserId,
      });
    }

    return updatedTransaction;
  });
};

// ─── Automated Gateway Methods (Phase 5) ────────────────────────────────────

export const initiateGatewayPayment = async (orderId: number) => {
  const order = await db.orm.public.Order.first({ id: orderId });
  if (!order) throw new NotFoundError("Order not found");

  if (order.paymentStatus === "PAID") {
    throw new ConflictError("Order is already paid");
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

  const result = await adapter.initiatePayment(paymentConfig as any, {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      grandTotal: order.grandTotal,
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

  // Update transaction with session key and payload
  await db.orm.public.OrderPaymentTransaction.where({ id: transaction.id }).update({
    transactionId: result.transactionId || transaction.transactionId,
    gatewayPayload: result.gatewayResponse || null,
  });

  return result;
};

export const handleGatewayCallback = async (
  gatewayCode: string,
  query: any,
  body: any,
) => {
  const orderId = Number(query.orderId);
  const statusParam = query.status;

  if (!orderId) throw new ValidationError("Missing orderId in callback");

  const order = await db.orm.public.Order.first({ id: orderId });
  if (!order) throw new NotFoundError("Order not found");

  const paymentConfig = await repo.findByCode(gatewayCode);
  if (!paymentConfig) throw new NotFoundError("Payment gateway configuration not found");

  const transaction = await db.orm.public.OrderPaymentTransaction
    .where({ orderId })
    .orderBy((t: any) => t.createdAt.desc())
    .first();

  const frontendUrl =
    (appConfig.cors.origins && appConfig.cors.origins[0]) || "http://localhost:3000";

  // If already paid, redirect straight to order-success
  if (order.paymentStatus === "PAID") {
    return { redirectUrl: `${frontendUrl}/order-success/${order.orderNumber}` };
  }

  // If user cancelled
  if (statusParam === "cancel") {
    if (transaction) {
      await db.orm.public.OrderPaymentTransaction.where({ id: transaction.id }).update({
        status: "REJECTED",
        adminNote: "Customer cancelled payment on gateway page",
        gatewayResponse: body || query,
      });
    }
    return {
      redirectUrl: `${frontendUrl}/order-success/${order.orderNumber}?payment=cancelled`,
    };
  }

  // If failed
  if (statusParam === "fail") {
    if (transaction) {
      await db.orm.public.OrderPaymentTransaction.where({ id: transaction.id }).update({
        status: "REJECTED",
        adminNote: "Payment failed on gateway",
        gatewayResponse: body || query,
      });
    }
    return {
      redirectUrl: `${frontendUrl}/order-success/${order.orderNumber}?payment=failed`,
    };
  }

  // Verify through adapter
  const adapter = getPaymentAdapter(paymentConfig as any);
  const verifyResult = await adapter.verifyPayment(paymentConfig as any, {
    transactionId: transaction?.transactionId || undefined,
    payload: { ...query, ...body },
  });

  await db.transaction(async (tx: any) => {
    if (verifyResult.isValid) {
      if (transaction) {
        await tx.orm.public.OrderPaymentTransaction.where({ id: transaction.id }).update({
          status: "VERIFIED",
          transactionId: verifyResult.transactionId || transaction.transactionId,
          gatewayResponse: verifyResult.rawResponse,
          verifiedAt: new Date(),
          adminNote: `Verified automatically via ${paymentConfig.name}`,
        });
      }

      await tx.orm.public.Order.where({ id: order.id }).update({
        paymentStatus: "PAID",
      });

      await tx.orm.public.OrderStatusHistory.create({
        orderId: order.id,
        status: order.status,
        note: `Payment successfully completed via ${paymentConfig.name}. TrxID: ${verifyResult.transactionId}`,
      });
    } else {
      if (transaction) {
        await tx.orm.public.OrderPaymentTransaction.where({ id: transaction.id }).update({
          status: "REJECTED",
          gatewayResponse: verifyResult.rawResponse,
          adminNote: verifyResult.message || "Gateway verification failed",
        });
      }
      await tx.orm.public.Order.where({ id: order.id }).update({
        paymentStatus: "FAILED",
      });
    }
  });

  const querySuffix = verifyResult.isValid ? "?payment=success" : "?payment=failed";
  return { redirectUrl: `${frontendUrl}/order-success/${order.orderNumber}${querySuffix}` };
};
