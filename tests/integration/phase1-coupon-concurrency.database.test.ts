import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTestDatabaseUrl } from "../helpers/test-database.js";

const enabled = process.env.RUN_DATABASE_TESTS === "true";

describe.skipIf(!enabled)("Phase 1 C-03 coupon usage concurrency", () => {
  let dbModule: typeof import("../../src/prisma/db.js");
  let couponService: typeof import("../../src/modules/coupon/services/coupon.service.js");
  const couponIds: number[] = [];
  const orderIds: number[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = getTestDatabaseUrl();
    process.env.DATABASE_MIGRATION_URL = process.env.DATABASE_URL;
    process.env.DATABASE_TLS_MODE = "verify-full";
    dbModule = await import("../../src/prisma/db.js");
    couponService = await import("../../src/modules/coupon/services/coupon.service.js");
  });

  afterAll(async () => {
    for (const orderId of orderIds) await dbModule.db.orm.public.Order.where({ id: orderId }).delete();
    for (const couponId of couponIds) await dbModule.db.orm.public.Coupon.where({ id: couponId }).delete();
    await dbModule.closeDatabase();
  });

  it("allows only one concurrent transaction to consume a global usage slot", async () => {
    const coupon: any = await dbModule.db.orm.public.Coupon.create({
      code: `PH1-${randomUUID().slice(0, 10).toUpperCase()}`, name: "Phase 1 coupon", discountType: "PERCENTAGE",
      discountValue: "10.00", usageLimit: 1, isActive: true,
    });
    couponIds.push(coupon.id);
    const orders: any[] = [];
    for (let index = 0; index < 2; index += 1) {
      const order: any = await dbModule.db.orm.public.Order.create({
        orderNumber: `PH1-C-${randomUUID()}`, customerName: "Phase 1", customerPhone: "01700000000",
        status: "PENDING", paymentMethod: "CASH_ON_DELIVERY", paymentStatus: "UNPAID", subtotal: "100.00",
        shippingCharge: "0.00", discountAmount: "10.00", taxAmount: "0.00", grandTotal: "90.00", couponId: coupon.id, couponCode: coupon.code,
      });
      orderIds.push(order.id);
      orders.push(order);
    }

    const consume = (order: any) => dbModule.db.transaction(async (tx: any) => {
      const result: any = await couponService.validateAndCalculateInTransaction(tx, coupon.code, "100.00");
      await tx.orm.public.CouponUsage.create({ couponId: coupon.id, orderId: order.id, userId: null });
      return result;
    });
    const results = await Promise.allSettled([consume(orders[0]), consume(orders[1])]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const count: any = await dbModule.db.orm.public.CouponUsage.where({ couponId: coupon.id }).aggregate((a: any) => ({ total: a.count() }));
    expect(count.total).toBe(1);
  });
});
