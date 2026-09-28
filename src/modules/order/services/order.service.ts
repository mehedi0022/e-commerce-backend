import { createHash, randomBytes } from "node:crypto";
import { db } from "../../../prisma/db.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../errors/AppError.js";
import { moneyMultiply, moneySum } from "../../../utils/money.util.js";
import * as cartRepo from "../../cart/repositories/cart.repository.js";
import * as shipping from "../../shipping/services/shipping.service.js";
import * as repo from "../repositories/order.repository.js";
import * as couponService from "../../coupon/services/coupon.service.js";
import * as inventory from "../../inventory/services/inventory.service.js";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const orderNumber = () => `ORD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}-${randomBytes(2).toString("hex")}`;
const available = (v: any) => (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0);
const snapshotAddress = (x: any, type: string, orderId: number) => ({ orderId, type, fullName: x.fullName, phone: x.phone, addressLine1: x.addressLine1, addressLine2: x.addressLine2 ?? null, division: x.division ?? null, district: x.district, upazila: x.upazila ?? null, thana: x.thana ?? null, area: x.area ?? null, postalCode: x.postalCode ?? null, countryCode: String(x.countryCode ?? "BD").toUpperCase() });

const cartWithItems = async (userId?: number, guestToken?: string) => userId ? cartRepo.findUserCart(userId) : guestToken ? cartRepo.findGuestCart(guestToken) : null;
const selectMethod = async (zoneId: number, methodId: number) => { const options = await (await import("../../shipping/repositories/shipping.repository.js")).zoneOptions(zoneId); const selected = options.find((x: any) => x.methodId === methodId && x.isActive && x.method.isActive); if (!selected) throw new ConflictError("Selected shipping method is not available for this address"); return selected; };

export const commitOrderFulfillment = async (tx: any, orderId: number, orderNumber: string) => {
  const items: any[] = await tx.orm.public.OrderItem.select("id", "variantId", "quantity").where({ orderId }).all();
  items.sort((a, b) => (a.variantId ?? Number.MAX_SAFE_INTEGER) - (b.variantId ?? Number.MAX_SAFE_INTEGER));
  for (const item of items) {
    if (!item.variantId) throw new ConflictError("Order item has no fulfillable variant");
    await inventory.commitReservedStock(item.variantId, item.quantity, { referenceType: "ORDER", referenceId: orderNumber }, tx);
  }
};

export const checkout = async (input: any, userId?: number, guestToken?: string) => {
  if (input.paymentMethod !== "CASH_ON_DELIVERY") throw new ConflictError("Online payment is not available");
  const cart: any = await cartWithItems(userId, guestToken);
  if (!cart || cart.status !== "ACTIVE" || !cart.items.length) throw new ValidationError("Cart is empty");
  let ship: any; let bill: any;
  if (userId) { ship = await shipping.getAddress(userId, input.shippingAddressId); bill = input.billingSameAsShipping ? ship : await shipping.getAddress(userId, input.billingAddressId); } else { ship = input.shippingAddress; bill = input.billingSameAsShipping ? ship : input.billingAddress; }
  const zone = await shipping.resolveZone(ship); const method: any = await selectMethod(zone.id, input.shippingMethodId);
  const items = cart.items.map((item: any) => { const v = item.variant; if (!v || !v.isActive || v.product?.status !== "ACTIVE" || !v.inventory || item.quantity <= 0 || item.quantity > available(v)) throw new ConflictError(`Insufficient stock or unavailable product for ${v?.sku ?? item.variantId}`); const unitPrice = String(v.price); return { item, v, unitPrice, lineTotal: moneyMultiply(unitPrice, item.quantity) }; });
  const subtotal = moneySum(items.map((x: any) => x.lineTotal)); if (input.couponCode) await couponService.validateAndCalculate(input.couponCode, subtotal, userId);
  const shippingCharge = String(method.charge);
  const accessToken = userId ? undefined : randomBytes(32).toString("hex");
  const customerName = userId ? ship.fullName : input.customer.name; const customerPhone = userId ? ship.phone : input.customer.phone;
  const customerEmail = userId ? (await db.orm.public.User.select("email").first({ id: userId }))?.email : input.customer.email;
  const result = await db.transaction(async (tx: any) => {
    const appliedCoupon: any = input.couponCode ? await couponService.validateAndCalculateInTransaction(tx, input.couponCode, subtotal, userId) : null;
    const discountAmount = appliedCoupon?.discountAmount ?? "0.00";
    const grandTotal = moneySum([subtotal, shippingCharge, `-${discountAmount}`]);
    for (const x of items) await inventory.reserveStock(x.v.id, x.item.quantity, tx);
    const order = await repo.create(tx, { orderNumber: orderNumber(), userId: userId ?? null, customerName, customerEmail: customerEmail ?? null, customerPhone, status: "PENDING", paymentMethod: input.paymentMethod, paymentStatus: "UNPAID", couponId: appliedCoupon?.coupon.id ?? null, couponCode: appliedCoupon?.normalizedCode ?? null, subtotal, shippingCharge, discountAmount, taxAmount: "0.00", grandTotal, shippingZoneId: zone.id, shippingMethodId: method.methodId, shippingZoneName: zone.name, shippingMethodName: method.method.name, customerNote: input.customerNote ?? null, guestAccessTokenHash: accessToken ? tokenHash(accessToken) : null, guestAccessTokenExpiresAt: accessToken ? new Date(Date.now() + 30 * 86400000) : null });
    for (const x of items) { const oi = await repo.item(tx, { orderId: order.id, productId: x.v.productId, variantId: x.v.id, productName: x.v.product.name, productSlug: x.v.product.slug, sku: x.v.sku, quantity: x.item.quantity, unitPrice: x.unitPrice, lineTotal: x.lineTotal }); for (const av of x.v.attributeValues ?? []) await repo.itemAttribute(tx, { orderItemId: oi.id, attributeName: av.attributeValue.attribute.name, attributeValue: av.attributeValue.value }); }
    await repo.address(tx, snapshotAddress(ship, "SHIPPING", order.id)); await repo.address(tx, snapshotAddress(bill, "BILLING", order.id)); await repo.history(tx, { orderId: order.id, fromStatus: null, toStatus: "PENDING", note: null, changedById: userId ?? null }); if (appliedCoupon) await repo.couponUsage(tx, { couponId: appliedCoupon.coupon.id, orderId: order.id, userId: userId ?? null });
    const converted = await tx.orm.public.Cart.where({ id: cart.id, status: "ACTIVE" }).select("id").update({ status: "CONVERTED" }); if (!converted) throw new ConflictError("Cart has already been checked out");
    return order;
  });
  const safe = { orderNumber: result.orderNumber, status: result.status, paymentMethod: result.paymentMethod, paymentStatus: result.paymentStatus, subtotal: String(result.subtotal), shippingCharge: String(result.shippingCharge), discountAmount: String(result.discountAmount), taxAmount: String(result.taxAmount), grandTotal: String(result.grandTotal), ...(accessToken ? { guestAccessToken: accessToken } : {}) };
  return safe;
};

export const customerList = (userId: number, query: any) => repo.list({ ...query, userId });
export const adminList = (query: any) => repo.list(query);
export const detail = async (number: string, userId?: number, accessToken?: string) => { const x: any = userId ? await repo.findByNumber(number) : accessToken ? await repo.findGuest(number, tokenHash(accessToken)) : null; if (!x || (userId && x.userId !== userId) || (!userId && (!x.guestAccessTokenExpiresAt || new Date(x.guestAccessTokenExpiresAt).getTime() < Date.now()))) throw new NotFoundError("Order not found"); return x; };
export const transition = async (number: string, toStatus: string, changedById: number, note?: string) => { const current: any = await repo.findByNumber(number); if (!current) throw new NotFoundError("Order not found"); const allowed: Record<string, string[]> = { PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PROCESSING", "CANCELLED"], PROCESSING: [], SHIPPED: ["DELIVERED"] }; if (!allowed[current.status]?.includes(toStatus)) throw new ConflictError(`Cannot move order from ${current.status} to ${toStatus}; use Shipment fulfillment for shipping`); return db.transaction(async (tx: any) => { if (toStatus === "CANCELLED") for (const item of current.items) { if (!item.variantId) continue; await inventory.releaseStock(item.variantId, item.quantity, tx, { referenceType: "ORDER", referenceId: current.orderNumber }); } const data: any = { status: toStatus }; if (toStatus === "CONFIRMED") data.confirmedAt = new Date(); if (toStatus === "DELIVERED") data.deliveredAt = new Date(); if (toStatus === "CANCELLED") data.cancelledAt = new Date(); const updated = await repo.update(tx, current.id, data); await repo.history(tx, { orderId: current.id, fromStatus: current.status, toStatus, note: note ?? null, changedById }); return updated; }); };
