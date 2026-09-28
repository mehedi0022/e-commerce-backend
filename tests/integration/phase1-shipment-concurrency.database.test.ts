import { randomUUID } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTestDatabaseUrl } from "../helpers/test-database.js";

const enabled = process.env.RUN_DATABASE_TESTS === "true";

describe.skipIf(!enabled)("Phase 1 C-05 shipment fulfillment concurrency", () => {
  let dbModule: typeof import("../../src/prisma/db.js");
  let shipmentService: typeof import("../../src/modules/shipment/services/shipment.service.js");
  const userIds: number[] = [];
  const orderIds: number[] = [];
  const productIds: number[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = getTestDatabaseUrl();
    process.env.DATABASE_MIGRATION_URL = process.env.DATABASE_URL;
    process.env.DATABASE_TLS_MODE = "verify-full";
    dbModule = await import("../../src/prisma/db.js");
    shipmentService = await import("../../src/modules/shipment/services/shipment.service.js");
  });

  afterAll(async () => {
    for (const orderId of orderIds) {
      await dbModule.db.orm.public.Shipment.where({ orderId }).delete();
      await dbModule.db.orm.public.Order.where({ id: orderId }).delete();
    }
    for (const productId of productIds) await dbModule.db.orm.public.Product.where({ id: productId }).delete();
    for (const userId of userIds) await dbModule.db.orm.public.User.where({ id: userId }).delete();
    await dbModule.closeDatabase();
  });

  it("commits reserved stock only once for concurrent shipment transitions", async () => {
    const role: any = await dbModule.db.orm.public.Role.first({ key: "CUSTOMER" });
    const user: any = await dbModule.db.orm.public.User.create({ email: `${randomUUID()}@phase1-shipment.test`, password: "test", roleId: role.id });
    userIds.push(user.id);
    const product: any = await dbModule.db.orm.public.Product.create({ name: "Phase 1 shipment", slug: `phase1-shipment-${randomUUID()}`, status: "ACTIVE" });
    productIds.push(product.id);
    const variant: any = await dbModule.db.orm.public.ProductVariant.create({ productId: product.id, sku: `SHIP-${randomUUID()}`, price: "25.00" });
    const inventory: any = await dbModule.db.orm.public.Inventory.create({ variantId: variant.id, quantity: 10, reservedQuantity: 3 });
    const order: any = await dbModule.db.orm.public.Order.create({
      orderNumber: `PH1-S-${randomUUID()}`, userId: user.id, customerName: "Phase 1", customerPhone: "01700000000",
      status: "PROCESSING", paymentMethod: "CASH_ON_DELIVERY", paymentStatus: "UNPAID", subtotal: "75.00",
      shippingCharge: "0.00", discountAmount: "0.00", taxAmount: "0.00", grandTotal: "75.00", placedAt: Temporal.Now.instant(),
    });
    orderIds.push(order.id);
    await dbModule.db.orm.public.OrderItem.create({ orderId: order.id, variantId: variant.id, productName: product.name, sku: variant.sku, quantity: 3, unitPrice: "25.00", lineTotal: "75.00" });
    await dbModule.db.orm.public.Shipment.create({ orderId: order.id, status: "READY_TO_SHIP" });

    const ship = () => shipmentService.transition(order.orderNumber, "SHIPPED", user.id, "phase1 test");
    const results = await Promise.allSettled([ship(), ship()]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const finalInventory: any = await dbModule.db.orm.public.Inventory.first({ id: inventory.id });
    const finalOrder: any = await dbModule.db.orm.public.Order.first({ id: order.id });
    const finalShipment: any = await dbModule.db.orm.public.Shipment.first({ orderId: order.id });
    const movementCount: any = await dbModule.db.orm.public.InventoryMovement.where({ inventoryId: inventory.id, type: "ORDER" }).aggregate((a: any) => ({ total: a.count() }));
    expect(finalInventory.quantity).toBe(7);
    expect(finalInventory.reservedQuantity).toBe(0);
    expect(finalOrder.status).toBe("SHIPPED");
    expect(finalShipment.status).toBe("SHIPPED");
    expect(movementCount.total).toBe(1);
  });
});
