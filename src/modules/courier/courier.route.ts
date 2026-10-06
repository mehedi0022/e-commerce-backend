import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/courier.controller.js";
import * as v from "./validations/courier.validation.js";

const router = Router();

// ─── Public Tracking & Webhook Endpoints ─────────────────────────────────────
router.get("/track/:orderNumber", validate(v.trackParcelSchema), c.trackParcel);
router.post("/webhooks/:code", c.handleWebhook);

// ─── Protected Admin Endpoints ──────────────────────────────────────────────
router.use(requireAuth);

router.get(
  "/providers",
  requirePermission(permissions.ordersReadAny),
  c.getProviders
);

router.get(
  "/providers/:id",
  requirePermission(permissions.ordersReadAny),
  c.getProvider
);

router.patch(
  "/providers/:id",
  validate(v.updateCourierProviderSchema),
  requirePermission(permissions.ordersManage),
  c.updateProvider
);

router.get(
  "/providers/:code/balance",
  validate(v.courierCodeSchema),
  requirePermission(permissions.ordersReadAny),
  c.checkBalance
);

router.get(
  "/providers/:code/stores",
  validate(v.courierCodeSchema),
  requirePermission(permissions.ordersReadAny),
  c.getStores
);

router.post(
  "/orders/:orderNumber/book",
  validate(v.bookParcelSchema),
  requirePermission(permissions.ordersManage),
  c.bookParcel
);

router.post(
  "/orders/:orderNumber/sync",
  validate(v.trackParcelSchema),
  requirePermission(permissions.ordersManage),
  c.syncOrderCourier
);

router.post(
  "/sync-active",
  requirePermission(permissions.ordersManage),
  c.syncActiveShipments
);

router.get(
  "/orders/:orderNumber/track",
  validate(v.trackParcelSchema),
  requirePermission(permissions.ordersReadAny),
  c.trackParcel
);

export default router;
