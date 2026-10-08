# Comprehensive Courier & Order Management Audit Report

**Date:** 2026-10-08  
**Scope:** Courier integrations (`Pathao`, `Steadfast`), Order fulfillment, Stock lifecycle, Return/Refund inspection flows, Public tracking security, and Database consistency in Node.js + TypeScript + Express + Prisma (`@prisma/orm-postgres`).

---

## Executive Summary

An in-depth, read-only audit of the e-commerce fulfillment and inventory architecture was conducted across `src/modules/courier/**`, `src/modules/order/**`, `src/modules/inventory/**`, `src/modules/return/**`, `src/prisma/contract.prisma`, and system bootstrap configurations.

A total of **12 distinct gaps** were identified across Critical, High, Medium, and Low severity tiers:
1. **Critical (3):** Automatic restock on courier return bypassing physical inspection; failure to commit stock on courier status updates to `SHIPPED` / `DELIVERED`; and admin order cancellation of shipped orders stealing uncommitted stock reservations via `releaseStock`.
2. **High (4):** Missing database index on `Shipment.consignmentId`; absence of persistent `CourierWebhookEvent` audit log table; incorrect COD calculation and automated payment status changes on prepaid orders; and public tracking endpoint security leaks enabling sequential order scraping.
3. **Medium (4):** Duplicate customer SMS notifications triggered at booking and dispatch; shipment status backwards regressions caused by out-of-order courier webhooks; absence of `CRON_SECRET` authentication for automated background sync (`syncActiveShipments`); and missing `DAMAGED` audit movements and completion lifecycle in return item inspection.
4. **Low (1):** Webhook authentication rejecting unconfigured or missing credentials with HTTP 400 (`ValidationError`) rather than HTTP 401 (`AuthenticationError`).

---

## Audit Findings Matrix

| Gap ID | Severity | File & Line | Issue Summary | Production Failure Mode | Proposed Fix |
|---|---|---|---|---|---|
| **GAP-01** | **Critical** | `src/modules/courier/services/courier.service.ts:685-698` | Auto-restock on courier `returned_to_merchant` / `cancelled` bypasses inspection. | Damaged, opened, or tampered returned items are immediately returned to sellable inventory without physical verification, resulting in reselling broken goods to future customers. | Remove automatic inventory restock from courier return/cancellation handler. Idempotently create a `Return` record with items marked `restockStatus: PENDING` awaiting physical warehouse admin inspection. Leave inventory untouched. |
| **GAP-02** | **Critical** | `src/modules/courier/services/courier.service.ts:654-676` | Courier webhook/sync advancing orders to `SHIPPED` or `DELIVERED` never commits reserved stock. | Stock remains indefinitely in `reservedQuantity` while `quantity` is never decremented and no `ORDER` movement is written to `InventoryMovement`. Ledger and available stock permanently desynchronize. | Implement a centralized, idempotent helper `ensureOrderStockCommitted(orderId, orderNumber, tx)` that checks existing `ORDER` movements and commits reserved stock. Invoke it uniformly on admin transition, courier webhook, and courier sync. |
| **GAP-03** | **Critical** | `src/modules/order/services/order.service.ts:705-713` | Admin transition to `CANCELLED` unconditionally calls `inventory.releaseStock()`. | If an order was already shipped (`current.shippedAt` set), calling `releaseStock()` attempts to release reservations that were already consumed, either stealing another customer's reserved stock or throwing `ConflictError`. | Branch cancellation logic: if stock has already been committed (`current.shippedAt` set or fulfillment committed), do not call `releaseStock()`. Instead, initiate the Return inspection record. If cancelled before shipment, call `releaseStock()`. |
| **GAP-04** | **High** | `src/prisma/contract.prisma:1107-1145` | Missing index on `Shipment.consignmentId` and missing `CourierWebhookEvent` audit log table. | High-frequency courier webhooks performing lookups on `consignmentId` trigger full table scans. Furthermore, webhooks without persistent logging cannot be replayed or audited upon failure. | Add `@@index([consignmentId])` to `Shipment`. Add `CourierWebhookEvent` model storing courier code, event type, identifiers, payload, outcome, error, and timestamp. Apply via Prisma migration. |
| **GAP-05** | **High** | `src/modules/courier/services/courier.service.ts:171-174`, `src/modules/courier/adapters/steadfast.adapter.ts:50`, `pathao.adapter.ts:170` | Fallback calculation sets non-zero COD amount on prepaid orders; auto-marking `PAID` applies to prepaid orders. | Prepaid online orders (e.g. bKash, SSLCommerz, cards) where `dueAmount` is null or zero could fall back to `grandTotal`, forcing couriers to collect cash from customers who already paid. Additionally, unpaid online orders delivered by courier get auto-marked `PAID`. | Enforce that if `order.paymentStatus === 'PAID'` or `order.paymentMethod === 'ONLINE'`, `codAmount` sent to courier is strictly 0. Auto-marking `paymentStatus = 'PAID'` upon courier delivery must only trigger for `CASH_ON_DELIVERY` or `PARTIAL_COD`. |
| **GAP-06** | **High** | `src/modules/order/services/order.service.ts:625-636`, `src/modules/order/order.route.ts:9` | Public tracking `GET /orders/track` allows optional phone, substring matching via `.includes()`, leaks sensitive customer info, and lacks dedicated rate limiting. | Attackers can iterate through sequential IDs (`ORD-1001`, `ORD-1002`) without phone verification, harvesting customer full names, order amounts, and shipping districts. | Require both `orderNumber` and `phone` strictly. Normalize and verify exact last-10-digits (`===`). Return a unified 404 message ("No order found matching the provided details"). Restrict returned fields to tracking basics. Apply `express-rate-limit`. |
| **GAP-07** | **High** | `src/modules/courier/services/courier.service.ts:294-302` vs `src/modules/order/services/order.service.ts:793-797` | Duplicate SMS sent to customer upon parcel booking and again upon order dispatch. | When an admin clicks "Book Courier", an `ORDER_SHIPPED` SMS is immediately triggered (often days before pickup), and when the parcel physically leaves and status changes to `SHIPPED`, a duplicate SMS is sent. | Remove notification dispatch from `bookParcel()`. Only dispatch `ORDER_SHIPPED` notification when shipment/order status transitions to `SHIPPED` and actual tracking information is available. |
| **GAP-08** | **Medium** | `src/modules/courier/services/courier.service.ts:629-644` | Shipment status allows backward transitions upon receiving out-of-order webhooks. | If an `IN_TRANSIT` webhook arrives after an `OUT_FOR_DELIVERY` webhook, the shipment regresses to `IN_TRANSIT`. Furthermore, terminal statuses must never be overwritten. | Implement forward-only status progression using a defined status rank (`PENDING` < `READY_TO_SHIP` < `SHIPPED` < `IN_TRANSIT` < `OUT_FOR_DELIVERY` < `DELIVERED`). Terminal states `DELIVERED` and `RETURNED` must reject regression. |
| **GAP-09** | **Medium** | `src/modules/courier/services/courier.service.ts:432-487`, `src/modules/courier/courier.route.ts:100` | `syncActiveShipments` endpoint requires user admin authentication; cron jobs cannot authenticate. | Background cron workers (e.g. systemd timer, cron daemon, Cloudflare Worker) cannot trigger courier sync without creating simulated admin session cookies. | Allow `POST /sync-active` to be authenticated by a secure `x-cron-secret` header matching `process.env.CRON_SECRET` in addition to admin session auth. |
| **GAP-10** | **Medium** | `src/modules/return/services/return.service.ts:47` | Return item inspection does not record `DAMAGED` audit movements for unsellable stock and does not auto-complete returns. | Warehouse admins inspecting damaged goods do not get an audit trail in `InventoryMovement`, making loss untraceable. Furthermore, returns remain stuck in `RECEIVED` even after all items are finalized. | In `inspect()`, when restock quantity is 0 or less than inspected quantity due to damage, log an `InventoryMovement` entry with type `DAMAGED`, `quantity: 0`, and reference to the order number. Automatically mark the `Return` as `COMPLETED` when all return items have reached final restock status. |
| **GAP-11** | **Low** | `src/modules/courier/services/courier.service.ts:754-768` | Webhook verification throws `ValidationError` (HTTP 400) when secrets are missing or unconfigured. | Couriers interpret HTTP 400 as a bad payload format rather than an authentication failure, complicating integration monitoring. | Throw `AuthenticationError` (HTTP 401) for missing headers, unconfigured secrets, and signature mismatches. |
| **GAP-12** | **Low** | `.env.example`, `src/config/env.ts` | Missing documentation and environment schema definitions for courier webhook secrets and cron secret. | Deployments lack visibility into required webhook authentication variables (`PATHAO_WEBHOOK_INTEGRATION_SECRET`, `PATHAO_WEBHOOK_SECRET`, `STEADFAST_WEBHOOK_SECRET`, `CRON_SECRET`). | Add variables to `.env.example` with detailed comments and integrate optional schemas into `src/config/env.ts`. |

---

## Implementation Roadmap (Phase 2)

Fixes will be implemented strictly adhering to the priority order:
1. **Critical:**
   - Define shared idempotent stock commit function `ensureOrderStockCommitted`.
   - Update courier webhook & sync status update logic to commit stock on `SHIPPED`/`DELIVERED`.
   - Route courier `cancelled`/`returned_to_merchant` and admin `CANCELLED` of shipped orders to the `Return` creation flow rather than auto-restocking or releasing stock.
2. **High:**
   - Create Prisma migration adding `Shipment.consignmentId` index and `CourierWebhookEvent` table.
   - Enforce 0 COD amount on prepaid orders and restrict auto-marking `PAID` to COD methods.
   - Harden public tracking endpoints with mandatory phone, last-10-digit exact match, rate limiting, and minimal response payload.
   - Remove duplicate `ORDER_SHIPPED` SMS from `bookParcel()`.
3. **Medium:**
   - Enforce forward-only status rank progression on `Shipment`.
   - Support `CRON_SECRET` header for `syncActiveShipments`.
   - Record `DAMAGED` audit movements and auto-complete returns upon inspecting all items.
4. **Low:**
   - Return HTTP 401 for webhook authentication failures.
   - Document new environment variables in `.env.example` and register in `src/config/env.ts`.
