import { db } from "../../../prisma/db.js";
import { NotFoundError, ConflictError } from "../../../errors/AppError.js";
import { Temporal } from "temporal-polyfill";
import * as repo from "../repositories/incomplete-order.repository.js";
import type {
  CaptureIncompleteOrderInput,
  UpdateIncompleteOrderInput,
  IncompleteOrderQuery,
  ConvertIncompleteOrderInput,
} from "../incomplete-order.types.js";

export const capture = async (data: CaptureIncompleteOrderInput) => {
  return repo.upsertCapture(data);
};

export const list = async (query: IncompleteOrderQuery) => {
  return repo.findAll(query);
};

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError("Incomplete order not found");
  return item;
};

export const getMetrics = async () => {
  return repo.getMetrics();
};

export const update = async (id: number, data: UpdateIncompleteOrderInput) => {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Incomplete order not found");
  await repo.update(id, data);
  return repo.findById(id);
};

export const convertToOrder = async (
  id: number,
  agentUserId: number,
  overrides?: ConvertIncompleteOrderInput
) => {
  const item: any = await repo.findById(id);
  if (!item) throw new NotFoundError("Incomplete order not found");
  if (item.status === "CONVERTED" && item.convertedOrderId) {
    throw new ConflictError("This lead has already been converted to an active order.");
  }

  const verifiedAddress = (overrides?.shippingAddress || item.shippingAddress || {}) as any;
  const verifiedItems = (overrides?.cartItems && overrides.cartItems.length > 0
    ? overrides.cartItems
    : item.cartItems || []) as any[];

  if (verifiedItems.length === 0) {
    throw new ConflictError("No items found in this incomplete order to create an order.");
  }

  const customerName = (
    overrides?.customerName ||
    verifiedAddress.fullName ||
    item.customerName ||
    "Customer"
  ).trim();
  const customerPhone = (
    overrides?.customerPhone ||
    verifiedAddress.phone ||
    item.customerPhone
  ).trim();
  const customerEmail =
    overrides?.customerEmail !== undefined
      ? overrides.customerEmail || null
      : item.customerEmail || `${customerPhone}@customer.guest`;

  // Financial calculations
  let subtotalNum = 0;
  for (const ci of verifiedItems) {
    subtotalNum += (Number(ci.price) || 0) * (ci.quantity || 1);
  }

  const shippingChargeNum =
    overrides?.shippingFee !== undefined
      ? Number(overrides.shippingFee) || 0
      : Number(item.shippingFee) || 0;

  const discountAmountNum =
    overrides?.discountAmount !== undefined
      ? Number(overrides.discountAmount) || 0
      : 0;

  const advanceAmountNum =
    overrides?.advanceAmount !== undefined
      ? Number(overrides.advanceAmount) || 0
      : 0;

  const grandTotalNum = Math.max(0, subtotalNum + shippingChargeNum - discountAmountNum);
  const dueAmountNum = Math.max(0, grandTotalNum - advanceAmountNum);

  const paymentMethod = overrides?.paymentMethod || "CASH_ON_DELIVERY";
  const paymentStatus =
    advanceAmountNum >= grandTotalNum && grandTotalNum > 0
      ? "PAID"
      : advanceAmountNum > 0
      ? "PARTIAL"
      : "UNPAID";

  const adminNote = overrides?.adminNote
    ? `Recovered by CRM Agent (User #${agentUserId}). Note: ${overrides.adminNote}`
    : `Recovered by CRM Agent (User #${agentUserId}) from Incomplete Order #${item.id}. Lead Notes: ${item.crmNotes || "None"}`;

  const order = await db.transaction(async (tx: any) => {
    // 1. Create order skeleton
    const created = await tx.orm.public.Order.create({
      orderNumber: "TEMP",
      userId: null,
      customerName,
      customerEmail,
      customerPhone,
      status: "CONFIRMED",
      paymentMethod,
      paymentStatus,
      subtotal: subtotalNum.toFixed(2),
      shippingCharge: shippingChargeNum.toFixed(2),
      discountAmount: discountAmountNum.toFixed(2),
      taxAmount: "0.00",
      grandTotal: grandTotalNum.toFixed(2),
      advanceAmount: advanceAmountNum.toFixed(2),
      dueAmount: dueAmountNum.toFixed(2),
      isAdvanceRequired: advanceAmountNum > 0,
      adminNote,
      confirmedAt: Temporal.Now.instant(),
    });

    const finalOrderNumber = `ORD-${1000 + parseInt(created.id)}`;
    await tx.orm.public.Order.where({ id: created.id }).update({ orderNumber: finalOrderNumber });
    created.orderNumber = finalOrderNumber;

    // 2. Create items
    for (const ci of verifiedItems) {
      let resolvedProductId = ci.productId || null;
      let resolvedVariantId = ci.variantId || null;

      // Auto-resolve productId if missing but variantId is known
      if (!resolvedProductId && resolvedVariantId) {
        const variant: any = await tx.orm.public.ProductVariant.select("id", "productId").first({ id: resolvedVariantId });
        if (variant) {
          resolvedProductId = variant.productId;
        }
      }

      // Auto-resolve from SKU if missing
      if ((!resolvedProductId || !resolvedVariantId) && ci.sku) {
        const variant: any = await tx.orm.public.ProductVariant.select("id", "productId").first({ sku: ci.sku });
        if (variant) {
          resolvedVariantId = resolvedVariantId || variant.id;
          resolvedProductId = resolvedProductId || variant.productId;
        }
      }

      // Auto-resolve from Product name if still missing
      if (!resolvedProductId && ci.name) {
        const prod: any = await tx.orm.public.Product.select("id").first({ name: ci.name });
        if (prod) {
          resolvedProductId = prod.id;
        }
      }

      await tx.orm.public.OrderItem.create({
        orderId: created.id,
        productId: resolvedProductId,
        variantId: resolvedVariantId,
        productName: ci.name || "Product",
        sku: ci.sku || "SKU-CRM",
        unitPrice: String(ci.price || 0),
        quantity: ci.quantity || 1,
        lineTotal: String((Number(ci.price || 0)) * (ci.quantity || 1)),
      });
    }

    // 3. Create shipping address snapshot
    await tx.orm.public.OrderAddress.create({
      orderId: created.id,
      type: "SHIPPING",
      fullName: customerName,
      phone: customerPhone,
      addressLine1: verifiedAddress.addressLine1 || "Address confirmed via CRM call",
      addressLine2: verifiedAddress.addressLine2 || null,
      division: verifiedAddress.division || null,
      district: verifiedAddress.district || "Dhaka",
      upazila: verifiedAddress.upazila || null,
      thana: verifiedAddress.thana || null,
      area: verifiedAddress.area || null,
      postalCode: verifiedAddress.postalCode || null,
      countryCode: verifiedAddress.countryCode || "BD",
    });

    // 4. Status history
    await tx.orm.public.OrderStatusHistory.create({
      orderId: created.id,
      fromStatus: "PENDING",
      toStatus: "CONFIRMED",
      changedById: agentUserId,
      note: `Order recovered by CRM from Abandoned Cart / Incomplete Lead #${item.id}`,
    });

    // 5. Update incomplete order record to CONVERTED
    await tx.orm.public.IncompleteOrder.where({ id: item.id }).update({
      status: "CONVERTED",
      convertedOrderId: created.id,
    });

    return created;
  });

  return order;
};
