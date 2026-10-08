import { Temporal } from "temporal-polyfill";
import request from "supertest";
import app from "../app.js";
import { db } from "../prisma/db.js";
import * as inventory from "../modules/inventory/services/inventory.service.js";
import * as courierService from "../modules/courier/services/courier.service.js";
import * as orderService from "../modules/order/services/order.service.js";
import * as returnService from "../modules/return/services/return.service.js";

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("   COURIER & ORDER HARDENING FULL SYSTEM VERIFICATION SUITE       ");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // Setup test environment variables
  process.env.STEADFAST_WEBHOOK_SECRET = "sf_secret_token_123";
  process.env.PATHAO_WEBHOOK_SECRET = "pt_secret_sig_456";
  process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET = "pt_handshake_secret_789";
  process.env.CRON_SECRET = "cron_sync_secret_999";

  // Ensure courier provider configs exist
  let sfConfig = await db.orm.public.CourierProviderConfig.first({ code: "steadfast" });
  if (!sfConfig) {
    sfConfig = await db.orm.public.CourierProviderConfig.create({
      code: "steadfast",
      name: "Steadfast Courier",
      apiKey: "sf_api_key",
      apiSecret: "sf_api_secret",
      apiUrl: "https://portal.packzy.com/api/v1",
      isActive: true,
      isDefault: true,
      settings: { webhookSecret: "sf_secret_token_123" },
    });
  } else {
    await db.orm.public.CourierProviderConfig.where({ id: sfConfig.id }).update({
      settings: { webhookSecret: "sf_secret_token_123" },
      isActive: true,
    });
  }

  let ptConfig = await db.orm.public.CourierProviderConfig.first({ code: "pathao" });
  if (!ptConfig) {
    ptConfig = await db.orm.public.CourierProviderConfig.create({
      code: "pathao",
      name: "Pathao Courier",
      apiKey: "pt_api_key",
      apiSecret: "pt_api_secret",
      apiUrl: "https://courier-api-sandbox.pathao.com",
      isActive: true,
      settings: {
        webhookSecret: "pt_secret_sig_456",
        webhookIntegrationSecret: "pt_handshake_secret_789",
      },
    });
  } else {
    await db.orm.public.CourierProviderConfig.where({ id: ptConfig.id }).update({
      settings: {
        webhookSecret: "pt_secret_sig_456",
        webhookIntegrationSecret: "pt_handshake_secret_789",
      },
      isActive: true,
    });
  }

  // Find or create an admin user for audit tracking
  let adminUser = await db.orm.public.User.first();
  if (!adminUser) {
    const role = (await db.orm.public.Role.first()) || (await db.orm.public.Role.create({ key: "ADMIN", name: "Admin", rank: 7 }));
    adminUser = await db.orm.public.User.create({
      email: "admin@test.local",
      userName: `admin_${Date.now()}`,
      password: "argon2_dummy_hash",
      fullName: "Admin Tester",
      roleId: role.id,
      isActive: true,
    });
  }

  // Create a test product & variant for inventory tests
  const testSku = `SKU-VERIFY-${Date.now()}`;
  const testProduct = await db.orm.public.Product.create({
    name: "Verification Test Product",
    slug: `verify-product-${Date.now()}`,
    status: "ACTIVE",
  });

  const testVariant = await db.orm.public.ProductVariant.create({
    productId: testProduct.id,
    sku: testSku,
    price: "100.00",
    isActive: true,
  } as any);

  // Initialize inventory: 50 units
  let inv = await db.orm.public.Inventory.first({ variantId: testVariant.id });
  if (!inv) {
    inv = await db.orm.public.Inventory.create({
      variantId: testVariant.id,
      quantity: 50,
      reservedQuantity: 0,
      lowStockThreshold: 5,
    });
  }

  console.log(`✓ Test fixture prepared: Variant ID ${testVariant.id}, Initial Quantity: 50\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Steadfast Webhook Authentication & Delivery Stock Commit
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("▶ [Scenario 1] Steadfast Webhook Auth & Stock Commit...");
  // 1a. Missing Bearer -> 401
  let sfAuthFailed = false;
  try {
    await courierService.handleCourierWebhook("steadfast", { status: "delivered" }, {});
  } catch (err: any) {
    sfAuthFailed = err.name === "AuthenticationError" || err.message?.includes("Bearer");
  }
  if (!sfAuthFailed) throw new Error("Scenario 1 failed: Steadfast without Bearer did not reject with 401");
  console.log("  ✓ Steadfast rejected missing Bearer with 401 AuthenticationError");

  // 1b. Create order with 2 reserved units
  const orderNum1 = `ORD-SF-${Date.now()}`;
  const order1 = await db.orm.public.Order.create({
    orderNumber: orderNum1,
    status: "PROCESSING",
    customerName: "Rahim Chowdhury",
    customerPhone: "+8801712345678",
    subtotal: "200.00",
    shippingCharge: "0.00",
    grandTotal: "200.00",
    dueAmount: "200.00",
    paymentMethod: "CASH_ON_DELIVERY",
    paymentStatus: "UNPAID",
  } as any);

  await db.orm.public.OrderItem.create({
    orderId: order1.id,
    variantId: testVariant.id,
    quantity: 2,
    unitPrice: "100.00",
    lineTotal: "200.00",
    productName: "Verification Test Product",
    sku: testSku,
  } as any);

  await inventory.reserveStock(testVariant.id, 2);
  let invAfterRes1 = (await db.orm.public.Inventory.first({ variantId: testVariant.id }))!;
  console.log(`  ✓ Stock reserved: quantity = ${invAfterRes1.quantity}, reservedQuantity = ${invAfterRes1.reservedQuantity}`);

  const consignmentId1 = `SF-CONS-${Date.now()}`;
  await db.orm.public.Shipment.create({
    orderId: order1.id,
    status: "READY_TO_SHIP",
    courierName: "Steadfast Courier",
    courierCode: "steadfast",
    consignmentId: consignmentId1,
    trackingNumber: consignmentId1,
  });

  // Valid Bearer + delivered
  const sfResult = await courierService.handleCourierWebhook(
    "steadfast",
    { consignment_id: consignmentId1, status: "delivered" },
    { authorization: "Bearer sf_secret_token_123" },
  );

  const updatedOrder1 = (await db.orm.public.Order.first({ id: order1.id }))!;
  const updatedShipment1 = (await db.orm.public.Shipment.first({ orderId: order1.id }))!;
  const invAfterDel1 = (await db.orm.public.Inventory.first({ variantId: testVariant.id }))!;

  if (updatedOrder1.status !== "DELIVERED" || updatedShipment1.status !== "DELIVERED") {
    throw new Error("Scenario 1 failed: Order / Shipment was not marked DELIVERED");
  }
  if (updatedOrder1.paymentStatus !== "PAID") {
    throw new Error("Scenario 1 failed: COD order delivered was not auto-marked PAID");
  }
  if (invAfterDel1.quantity !== 48 || invAfterDel1.reservedQuantity !== 0) {
    throw new Error(`Scenario 1 failed: Stock not committed. Expected quantity 48, reserved 0. Got: ${invAfterDel1.quantity}, ${invAfterDel1.reservedQuantity}`);
  }
  console.log(`  ✓ Steadfast valid Bearer + delivered -> order DELIVERED, payment PAID, stock committed (qty: 48, res: 0)\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Pathao Webhook Handshake & Signature Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("▶ [Scenario 2] Pathao Webhook Handshake & Signature Auth...");
  // Unset env var to prove handshake resolution works directly from DB settings
  const prevEnvHandshake = process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET;
  delete process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET;

  // 2a. Handshake: POST /api/v1/courier/webhooks/pathao with event "webhook_integration" -> 202 + header
  const handshakeRes = await request(app)
    .post("/api/v1/courier/webhooks/pathao")
    .send({ event: "webhook_integration" });

  if (prevEnvHandshake) {
    process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET = prevEnvHandshake;
  }

  if (handshakeRes.status !== 202) {
    throw new Error(`Scenario 2 failed: Pathao handshake expected HTTP 202, got ${handshakeRes.status}`);
  }
  const returnedHeader = handshakeRes.headers["x-pathao-merchant-webhook-integration-secret"];
  if (returnedHeader !== "pt_handshake_secret_789") {
    throw new Error(`Scenario 2 failed: Pathao handshake secret header missing or mismatch. Got ${returnedHeader}`);
  }
  console.log("  ✓ Pathao handshake returned HTTP 202 with X-Pathao-Merchant-Webhook-Integration-Secret header");

  // 2b. Wrong signature -> 401
  let ptAuthFailed = false;
  try {
    await courierService.handleCourierWebhook("pathao", { event: "order.delivered" }, { "x-pathao-signature": "wrong_sig" });
  } catch (err: any) {
    ptAuthFailed = err.name === "AuthenticationError" || err.message?.includes("credentials");
  }
  if (!ptAuthFailed) throw new Error("Scenario 2 failed: Pathao with wrong signature did not throw 401");
  console.log("  ✓ Pathao rejected invalid signature with 401 AuthenticationError\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 3 & 4: Duplicate Webhooks & Status Regression Protection
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("▶ [Scenario 3 & 4] Duplicate Webhooks & Forward-Only Status Progression...");
  const orderNum3 = `ORD-REG-${Date.now()}`;
  const order3 = await db.orm.public.Order.create({
    orderNumber: orderNum3,
    status: "PROCESSING",
    customerName: "Karim Uddin",
    customerPhone: "+8801812345678",
    subtotal: "100.00",
    shippingCharge: "0.00",
    grandTotal: "100.00",
    dueAmount: "100.00",
    paymentMethod: "CASH_ON_DELIVERY",
    paymentStatus: "UNPAID",
  } as any);

  await db.orm.public.OrderItem.create({
    orderId: order3.id,
    variantId: testVariant.id,
    quantity: 1,
    unitPrice: "100.00",
    lineTotal: "100.00",
    productName: "Verification Test Product",
    sku: testSku,
  } as any);
  await inventory.reserveStock(testVariant.id, 1);

  const consignmentId3 = `PT-CONS-${Date.now()}`;
  await db.orm.public.Shipment.create({
    orderId: order3.id,
    status: "OUT_FOR_DELIVERY",
    courierName: "Pathao Courier",
    courierCode: "pathao",
    consignmentId: consignmentId3,
    trackingNumber: consignmentId3,
  });

  // Deliver order
  await courierService.handleCourierWebhook(
    "pathao",
    { consignment_id: consignmentId3, event: "order.delivered" },
    { "x-pathao-signature": "pt_secret_sig_456" },
  );

  const invAfterDel3 = (await db.orm.public.Inventory.first({ variantId: testVariant.id }))!;
  const movementsAfterDel3 = await db.orm.public.InventoryMovement.where({
    referenceType: "ORDER",
    referenceId: orderNum3,
  }).all();

  if (movementsAfterDel3.length !== 1) {
    throw new Error(`Scenario 3 failed: Expected exactly 1 ORDER movement, got ${movementsAfterDel3.length}`);
  }
  console.log("  ✓ Delivered order stock committed exactly once");

  // Replay duplicate delivered webhook
  await courierService.handleCourierWebhook(
    "pathao",
    { consignment_id: consignmentId3, event: "order.delivered" },
    { "x-pathao-signature": "pt_secret_sig_456" },
  );

  const movementsAfterDup = await db.orm.public.InventoryMovement.where({
    referenceType: "ORDER",
    referenceId: orderNum3,
  }).all();

  if (movementsAfterDup.length !== 1) {
    throw new Error(`Scenario 3 failed: Duplicate webhook caused duplicate stock commit! Got ${movementsAfterDup.length} movements`);
  }
  console.log("  ✓ Duplicate delivered webhook handled idempotently (no duplicate stock movement)");

  // Send backward in_transit webhook on delivered shipment
  await courierService.handleCourierWebhook(
    "pathao",
    { consignment_id: consignmentId3, event: "in_transit" },
    { "x-pathao-signature": "pt_secret_sig_456" },
  );

  const shipAfterLate = (await db.orm.public.Shipment.first({ orderId: order3.id }))!;
  if (shipAfterLate.status !== "DELIVERED") {
    throw new Error(`Scenario 4 failed: Shipment regressed from DELIVERED to ${shipAfterLate.status}`);
  }
  console.log("  ✓ Out-of-order in_transit ignored: DELIVERED terminal status preserved without regression\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Cancel BEFORE Pickup (Reservation Released, Quantity Unchanged)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("▶ [Scenario 5] Cancel Before Pickup...");
  const orderNum5 = `ORD-CNCL-PRE-${Date.now()}`;
  const order5 = await db.orm.public.Order.create({
    orderNumber: orderNum5,
    status: "PROCESSING",
    customerName: "Sadia Sultana",
    customerPhone: "+8801912345678",
    subtotal: "100.00",
    shippingCharge: "0.00",
    grandTotal: "100.00",
    dueAmount: "100.00",
    paymentMethod: "CASH_ON_DELIVERY",
    paymentStatus: "UNPAID",
  } as any);

  await db.orm.public.OrderItem.create({
    orderId: order5.id,
    variantId: testVariant.id,
    quantity: 1,
    unitPrice: "100.00",
    lineTotal: "100.00",
    productName: "Verification Test Product",
    sku: testSku,
  } as any);
  await inventory.reserveStock(testVariant.id, 1);

  const invBeforeCancel = (await db.orm.public.Inventory.first({ variantId: testVariant.id }))!;
  const qtyBeforeCancel = invBeforeCancel.quantity;

  // Transition to CANCELLED before shipment/commit
  await orderService.transition(orderNum5, "CANCELLED", adminUser.id, "Customer requested cancellation before shipment");

  const invAfterCancel = (await db.orm.public.Inventory.first({ variantId: testVariant.id }))!;
  if (invAfterCancel.quantity !== qtyBeforeCancel || invAfterCancel.reservedQuantity !== 0) {
    throw new Error(`Scenario 5 failed: Quantity changed or reservation not released. Expected qty ${qtyBeforeCancel}, res 0. Got: ${invAfterCancel.quantity}, ${invAfterCancel.reservedQuantity}`);
  }

  const retCheck5 = await db.orm.public.Return.first({ orderId: order5.id });
  if (retCheck5) {
    throw new Error("Scenario 5 failed: Return record should not be created for cancellation before dispatch");
  }
  console.log("  ✓ Cancellation before commit released reservation immediately; physical stock untouched; no Return record created\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 6: Courier Return AFTER Commit (Return Record Created, Stock UNCHANGED)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("▶ [Scenario 6] Courier Return After Commit (No Auto-Restock)...");
  const orderNum6 = `ORD-RET-POST-${Date.now()}`;
  const order6 = await db.orm.public.Order.create({
    orderNumber: orderNum6,
    status: "PROCESSING",
    customerName: "Tanvir Ahmed",
    customerPhone: "+8801612345678",
    subtotal: "300.00",
    shippingCharge: "0.00",
    grandTotal: "300.00",
    dueAmount: "300.00",
    paymentMethod: "CASH_ON_DELIVERY",
    paymentStatus: "UNPAID",
  } as any);

  const orderItem6 = await db.orm.public.OrderItem.create({
    orderId: order6.id,
    variantId: testVariant.id,
    quantity: 3,
    unitPrice: "100.00",
    lineTotal: "300.00",
    productName: "Verification Test Product",
    sku: testSku,
  } as any);
  await inventory.reserveStock(testVariant.id, 3);

  const consignmentId6 = `PT-RET-${Date.now()}`;
  await db.orm.public.Shipment.create({
    orderId: order6.id,
    status: "READY_TO_SHIP",
    courierName: "Pathao Courier",
    courierCode: "pathao",
    consignmentId: consignmentId6,
    trackingNumber: consignmentId6,
  });

  // Dispatch order to SHIPPED (commits stock)
  await orderService.transition(orderNum6, "SHIPPED", adminUser.id, "Dispatched with courier");

  const invAfterShip6 = (await db.orm.public.Inventory.first({ variantId: testVariant.id }))!;
  const stockAtShip = invAfterShip6.quantity;

  // Courier reports returned_to_merchant
  await courierService.handleCourierWebhook(
    "pathao",
    { consignment_id: consignmentId6, event: "returned_to_merchant" },
    { "x-pathao-signature": "pt_secret_sig_456" },
  );

  const orderAfterReturn = (await db.orm.public.Order.first({ id: order6.id }))!;
  const shipmentAfterReturn = (await db.orm.public.Shipment.first({ orderId: order6.id }))!;
  const invAfterReturn = (await db.orm.public.Inventory.first({ variantId: testVariant.id }))!;

  if (orderAfterReturn.status !== "CANCELLED" || shipmentAfterReturn.status !== "RETURNED") {
    throw new Error(`Scenario 6 failed: Expected CANCELLED order and RETURNED shipment. Got: ${orderAfterReturn.status}, ${shipmentAfterReturn.status}`);
  }
  if (invAfterReturn.quantity !== stockAtShip) {
    throw new Error(`Scenario 6 failed: Inventory was auto-restocked! Expected ${stockAtShip}, got ${invAfterReturn.quantity}`);
  }

  const returnRecord6 = await db.orm.public.Return.first({ orderId: order6.id });
  if (!returnRecord6 || returnRecord6.status !== "RECEIVED") {
    throw new Error("Scenario 6 failed: Return record was not created with status RECEIVED");
  }
  const returnItems6 = await db.orm.public.ReturnItem.where({ returnId: returnRecord6.id }).all();
  if (returnItems6.length !== 1 || returnItems6[0].restockStatus !== "PENDING") {
    throw new Error("Scenario 6 failed: Return items not pending inspection");
  }
  console.log(`  ✓ returned_to_merchant set order CANCELLED, shipment RETURNED, stock UNCHANGED (${invAfterReturn.quantity}), Return record created awaiting inspection\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 7: Admin Inspection (3 units: 2 Good + 1 Damaged)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("▶ [Scenario 7] Admin Inspection Flow (Partial Restock + Damaged Audit)...");
  const returnDetail = await returnService.get(returnRecord6.returnNumber);
  const targetReturnItem = returnDetail.items[0];

  // Inspect: 2 good/restocked, 1 damaged
  await returnService.inspect(
    returnRecord6.returnNumber,
    targetReturnItem.id,
    {
      condition: "GOOD",
      restockQuantity: 2,
      adminNote: "2 units in sealed box, 1 unit crushed during return transit",
    },
    adminUser.id,
  );

  const invAfterInspection = (await db.orm.public.Inventory.first({ variantId: testVariant.id }))!;
  if (invAfterInspection.quantity !== stockAtShip + 2) {
    throw new Error(`Scenario 7 failed: Expected stock quantity ${stockAtShip + 2}, got ${invAfterInspection.quantity}`);
  }

  const damagedMovement = await db.orm.public.InventoryMovement.first({
    type: "DAMAGED",
    referenceType: "ORDER",
    referenceId: orderNum6,
  });
  if (!damagedMovement || damagedMovement.quantity !== 0) {
    throw new Error("Scenario 7 failed: DAMAGED audit movement with quantity 0 was not recorded");
  }

  const finalReturn = (await db.orm.public.Return.first({ id: returnRecord6.id }))!;
  if (finalReturn.status !== "COMPLETED") {
    throw new Error(`Scenario 7 failed: Return was not auto-marked COMPLETED. Status is ${finalReturn.status}`);
  }
  console.log(`  ✓ 3 units inspected: 2 restored to inventory (qty +2), 1 damaged logged in InventoryMovement (qty 0), Return auto-completed\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 8: Public Tracking Security & Privacy Enforcement
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("▶ [Scenario 8] Public Tracking Security & Data Masking...");
  // 8a. /api/v1/courier/track/:orderNumber
  const noPhoneRes = await request(app).get(`/api/v1/courier/track/${orderNum1}`);
  if (noPhoneRes.status !== 400) {
    throw new Error(`Scenario 8 failed: Missing phone should return 400, got ${noPhoneRes.status}`);
  }

  const wrongPhoneRes = await request(app).get(`/api/v1/courier/track/${orderNum1}?phone=01999999999`);
  if (wrongPhoneRes.status !== 404) {
    throw new Error(`Scenario 8 failed: Phone mismatch should return 404, got ${wrongPhoneRes.status}`);
  }
  if (!wrongPhoneRes.body.message.includes("No order found")) {
    throw new Error(`Scenario 8 failed: Expected unified error message, got: ${wrongPhoneRes.body.message}`);
  }

  const validPhoneRes = await request(app).get(`/api/v1/courier/track/${orderNum1}?phone=01712345678`);
  if (validPhoneRes.status !== 200) {
    throw new Error(`Scenario 8 failed: Valid phone should return 200, got ${validPhoneRes.status}`);
  }
  const trackingData = validPhoneRes.body.data;
  if (trackingData.customerName || trackingData.customerPhone || trackingData.grandTotal) {
    throw new Error("Scenario 8 failed: Public tracking leaks sensitive customer data!");
  }
  console.log("  ✓ /api/v1/courier/track/:orderNumber: requires phone (400), unified 404 on mismatch, minimal fields only");

  // 8b. /api/v1/orders/track
  const orderTrackWrong = await request(app).get(`/api/v1/orders/track?orderNumber=${orderNum1}&phone=01999999999`);
  if (orderTrackWrong.status !== 404) {
    throw new Error(`Scenario 8 failed: /orders/track phone mismatch should return 404, got ${orderTrackWrong.status}`);
  }

  const orderTrackValid = await request(app).get(`/api/v1/orders/track?orderNumber=${orderNum1}&phone=01712345678`);
  if (orderTrackValid.status !== 200) {
    throw new Error(`Scenario 8 failed: /orders/track valid phone should return 200, got ${orderTrackValid.status}`);
  }
  if (orderTrackValid.body.data.customerName || orderTrackValid.body.data.customerPhone) {
    throw new Error("Scenario 8 failed: /orders/track leaks customer name/phone!");
  }
  console.log("  ✓ /api/v1/orders/track: requires phone, unified 404 on mismatch, minimal safe fields only\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 9: SQL Snippets & Audit Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("▶ [Scenario 9] Database Audit & Ledger Inspection Queries...");
  const recentMovements = await db.orm.public.InventoryMovement.where({
    inventoryId: inv.id,
  }).all();

  console.log(`\n  --- Inventory Movements for Variant ${testVariant.id} (${testSku}) ---`);
  for (const m of recentMovements.slice(-10)) {
    console.log(`  [${m.type.padEnd(16)}] qty: ${String(m.quantity).padStart(3)} | ref: ${m.referenceType || "-"} ${m.referenceId || "-"} | note: ${m.note || "-"}`);
  }

  const recentWebhookEvents = await db.orm.public.CourierWebhookEvent.where({
    courierCode: "pathao",
  }).all();
  console.log(`\n  --- Recent Courier Webhook Events (${recentWebhookEvents.length} recorded) ---`);
  for (const ev of recentWebhookEvents.slice(-5)) {
    console.log(`  [Event #${ev.id}] courier: ${ev.courierCode} | status: ${ev.status || "-"} | outcome: ${ev.outcome || "-"} | consignment: ${ev.consignmentId || "-"}`);
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("   ALL 9 VERIFICATION SCENARIOS COMPLETED SUCCESSFULLY (100% PASS) ");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ VERIFICATION TEST FAILED:", err);
    process.exit(1);
  });
