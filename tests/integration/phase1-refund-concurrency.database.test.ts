import { randomUUID } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTestDatabaseUrl } from "../helpers/test-database.js";

const enabled = process.env.RUN_DATABASE_TESTS === "true";

describe.skipIf(!enabled)("Phase 1 C-02 refund capacity concurrency", () => {
  let dbModule: typeof import("../../src/prisma/db.js");
  let refundService: typeof import("../../src/modules/refund/services/refund.service.js");
  const userIds: number[] = [];
  const orderIds: number[] = [];
  const returnIds: number[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = getTestDatabaseUrl();
    process.env.DATABASE_MIGRATION_URL = process.env.DATABASE_URL;
    process.env.DATABASE_TLS_MODE = "verify-full";
    dbModule = await import("../../src/prisma/db.js");
    refundService = await import("../../src/modules/refund/services/refund.service.js");
  });

  afterAll(async () => {
    for (const returnId of returnIds) {
      await dbModule.db.orm.public.Refund.where({ returnId }).delete();
      await dbModule.db.orm.public.Return.where({ id: returnId }).delete();
    }
    for (const orderId of orderIds) {
      await dbModule.db.orm.public.Refund.where({ orderId }).delete();
      await dbModule.db.orm.public.Order.where({ id: orderId }).delete();
    }
    for (const userId of userIds) await dbModule.db.orm.public.User.where({ id: userId }).delete();
    await dbModule.closeDatabase();
  });

  it("allows only one concurrent refund to consume the final capacity", async () => {
    const role: any = await dbModule.db.orm.public.Role.first({ key: "CUSTOMER" });
    const user: any = await dbModule.db.orm.public.User.create({ email: `${randomUUID()}@phase1-refund.test`, password: "test", roleId: role.id });
    userIds.push(user.id);
    const order: any = await dbModule.db.orm.public.Order.create({
      orderNumber: `PH1-F-${randomUUID()}`, userId: user.id, customerName: "Phase 1", customerPhone: "01700000000",
      status: "DELIVERED", paymentMethod: "CASH_ON_DELIVERY", paymentStatus: "UNPAID", subtotal: "100.00",
      shippingCharge: "0.00", discountAmount: "0.00", taxAmount: "0.00", grandTotal: "100.00", deliveredAt: Temporal.Now.instant(),
    });
    orderIds.push(order.id);
    const orderItem: any = await dbModule.db.orm.public.OrderItem.create({ orderId: order.id, productName: "Refund item", sku: `REF-${randomUUID()}`, quantity: 1, unitPrice: "100.00", lineTotal: "100.00" });
    const ret: any = await dbModule.db.orm.public.Return.create({ returnNumber: `PH1-FR-${randomUUID()}`, orderId: order.id, userId: user.id, status: "RECEIVED" });
    returnIds.push(ret.id);
    await dbModule.db.orm.public.ReturnItem.create({ returnId: ret.id, orderItemId: orderItem.id, quantity: 1, reason: "DAMAGED" });
    const existing: any = await dbModule.db.orm.public.Refund.create({ refundNumber: `PH1-OLD-${randomUUID()}`, orderId: order.id, returnId: ret.id, amount: "80.00", status: "COMPLETED" });
    await dbModule.db.orm.public.RefundStatusHistory.create({ refundId: existing.id, fromStatus: null, toStatus: "COMPLETED", changedById: user.id });

    const create = () => refundService.create(ret.returnNumber, { amount: "20.00", method: "CASH", reason: "test" }, user.id);
    const results = await Promise.allSettled([create(), create()]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const refunds: any[] = await dbModule.db.orm.public.Refund.select("amount", "status").where({ returnId: ret.id }).all();
    expect(refunds.filter((refund) => ["PENDING", "PROCESSING", "COMPLETED"].includes(refund.status)).reduce((sum, refund) => sum + Number(refund.amount), 0)).toBe(100);
  });
});
