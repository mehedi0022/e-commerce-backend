import { randomUUID } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTestDatabaseUrl } from "../helpers/test-database.js";

const enabled = process.env.RUN_DATABASE_TESTS === "true";

describe.skipIf(!enabled)("Phase 1 C-01 return restock concurrency", () => {
  let dbModule: typeof import("../../src/prisma/db.js");
  let returnService: typeof import("../../src/modules/return/services/return.service.js");
  const productIds: number[] = [];
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
    for (const productId of productIds) await dbModule.db.orm.public.Product.where({ id: productId }).delete();
    await dbModule.closeDatabase();
  });

  it("restocks a ReturnItem once under concurrent inspection and rejects retry", async () => {
    const product: any = await dbModule.db.orm.public.Product.create({ name: "Phase 1 restock", slug: `phase1-restock-${randomUUID()}`, status: "ACTIVE" });
    productIds.push(product.id);
    const variant: any = await dbModule.db.orm.public.ProductVariant.create({ productId: product.id, sku: `RESTOCK-${randomUUID()}`, price: "10.00" });
    const inventory: any = await dbModule.db.orm.public.Inventory.create({ variantId: variant.id, quantity: 10, reservedQuantity: 0 });
    const role: any = await dbModule.db.orm.public.Role.first({ key: "CUSTOMER" });
    const user: any = await dbModule.db.orm.public.User.create({ email: `${randomUUID()}@phase1-restock.test`, password: "test", roleId: role.id });
    const order: any = await dbModule.db.orm.public.Order.create({ orderNumber: `PH1-R-${randomUUID()}`, userId: user.id, customerName: "Phase 1", customerPhone: "01700000000", status: "DELIVERED", paymentMethod: "CASH_ON_DELIVERY", paymentStatus: "UNPAID", subtotal: "20.00", shippingCharge: "0.00", discountAmount: "0.00", taxAmount: "0.00", grandTotal: "20.00", deliveredAt: Temporal.Now.instant() });
    orderIds.push(order.id);
    const orderItem: any = await dbModule.db.orm.public.OrderItem.create({ orderId: order.id, variantId: variant.id, productName: product.name, sku: variant.sku, quantity: 2, unitPrice: "10.00", lineTotal: "20.00" });
    const ret: any = await dbModule.db.orm.public.Return.create({ returnNumber: `PH1-RET-${randomUUID()}`, orderId: order.id, userId: user.id, status: "RECEIVED" });
    const item: any = await dbModule.db.orm.public.ReturnItem.create({ returnId: ret.id, orderItemId: orderItem.id, quantity: 2, reason: "DAMAGED" });

    const results = await Promise.allSettled([
      returnService.inspect(ret.returnNumber, item.id, { condition: "GOOD", restockQuantity: 2 }, user.id),
      returnService.inspect(ret.returnNumber, item.id, { condition: "GOOD", restockQuantity: 2 }, user.id),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const finalInventory: any = await dbModule.db.orm.public.Inventory.first({ id: inventory.id });
    const movementCount: any = await dbModule.db.orm.public.InventoryMovement.where({ inventoryId: inventory.id, type: "RETURN" }).aggregate((a: any) => ({ total: a.count() }));
    const finalItem: any = await dbModule.db.orm.public.ReturnItem.first({ id: item.id });
    expect(finalInventory.quantity).toBe(12);
    expect(finalItem.restockStatus).toBe("RESTOCKED");
    expect(movementCount.total).toBe(1);
  });
});
