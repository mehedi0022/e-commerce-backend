import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Temporal } from "temporal-polyfill";
import { getTestDatabaseUrl } from "../helpers/test-database.js";

const enabled = process.env.RUN_DATABASE_TESTS === "true";

describe.skipIf(!enabled)("Phase 1 C-04 return quantity concurrency", () => {
  let dbModule: typeof import("../../src/prisma/db.js");
  let returnService: typeof import("../../src/modules/return/services/return.service.js");
  const userIds: number[] = [];
  const orderIds: number[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = getTestDatabaseUrl();
    process.env.DATABASE_MIGRATION_URL = process.env.DATABASE_URL;
    process.env.DATABASE_TLS_MODE = "verify-full";
    dbModule = await import("../../src/prisma/db.js");
    returnService = await import("../../src/modules/return/services/return.service.js");
  });

  afterAll(async () => {
    for (const orderId of orderIds) {
      await dbModule.db.orm.public.Return.where({ orderId }).delete();
      await dbModule.db.orm.public.Order.where({ id: orderId }).delete();
    }
    for (const userId of userIds) await dbModule.db.orm.public.User.where({ id: userId }).delete();
    await dbModule.closeDatabase();
  });

  it("allows only one overlapping return to consume the final OrderItem capacity", async () => {
    const role: any = await dbModule.db.orm.public.Role.first({ key: "CUSTOMER" });
    expect(role).not.toBeNull();
    const user: any = await dbModule.db.orm.public.User.create({
      email: `${randomUUID()}@phase1-return.test`, password: "test", roleId: role.id,
    });
    userIds.push(user.id);
    const order: any = await dbModule.db.orm.public.Order.create({
      orderNumber: `PH1-${randomUUID()}`, userId: user.id, customerName: "Phase 1", customerPhone: "01700000000",
      status: "DELIVERED", paymentMethod: "CASH_ON_DELIVERY", paymentStatus: "UNPAID",
      subtotal: "10.00", shippingCharge: "0.00", discountAmount: "0.00", taxAmount: "0.00", grandTotal: "10.00",
      deliveredAt: Temporal.Now.instant(),
    });
    orderIds.push(order.id);
    const item: any = await dbModule.db.orm.public.OrderItem.create({
      orderId: order.id, productName: "Phase 1 item", sku: `SKU-${randomUUID()}`, quantity: 1,
      unitPrice: "10.00", lineTotal: "10.00",
    });

    const results = await Promise.allSettled([
      returnService.create(order.orderNumber, user.id, { items: [{ orderItemId: item.id, quantity: 1, reason: "DAMAGED" }] }),
      returnService.create(order.orderNumber, user.id, { items: [{ orderItemId: item.id, quantity: 1, reason: "DAMAGED" }] }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const rows: any[] = await dbModule.db.orm.public.ReturnItem
      .include("return", (x: any) => x.select("status"))
      .where({ orderItemId: item.id }).all();
    expect(rows.filter((row) => ["REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED", "COMPLETED"].includes(row.return.status)).reduce((sum, row) => sum + row.quantity, 0)).toBe(1);
  });
});
