import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/courier.controller.js";
import * as v from "./validations/courier.validation.js";

const router = Router();

import crypto from "crypto";
import rateLimit from "express-rate-limit";

const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
});

const safeSecretMatch = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const cronOrAdminAuth = (req: any, res: any, next: any) => {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = String(req.headers["x-cron-secret"] || "").trim();
  if (cronSecret && headerSecret && safeSecretMatch(headerSecret, cronSecret)) {
    return next();
  }
  return requireAuth(req, res, () => {
    return requirePermission(permissions.ordersManage)(req, res, next);
  });
};

// ─── Public Tracking & Webhook Endpoints ─────────────────────────────────────
router.get(
  "/track/:orderNumber",
  trackLimiter,
  validate(v.publicTrackParcelSchema),
  c.publicTrackParcel,
);
router.post("/webhooks/:code", c.handleWebhook);
router.post("/sync-active", cronOrAdminAuth, c.syncActiveShipments);

// ─── Protected Admin Endpoints ──────────────────────────────────────────────
router.use(requireAuth);

router.get(
  "/providers",
  requirePermission(permissions.ordersReadAny),
  c.getProviders,
);

router.get(
  "/providers/:id",
  requirePermission(permissions.ordersReadAny),
  c.getProvider,
);

router.patch(
  "/providers/:id",
  validate(v.updateCourierProviderSchema),
  requirePermission(permissions.ordersManage),
  c.updateProvider,
);

router.get(
  "/providers/:code/balance",
  validate(v.courierCodeSchema),
  requirePermission(permissions.ordersReadAny),
  c.checkBalance,
);

router.get(
  "/providers/:code/stores",
  validate(v.courierCodeSchema),
  requirePermission(permissions.ordersReadAny),
  c.getStores,
);

router.get(
  "/providers/:code/cities",
  validate(v.courierCodeSchema),
  requirePermission(permissions.ordersReadAny),
  c.getCities,
);

router.get(
  "/providers/:code/cities/:cityId/zones",
  validate(v.courierZonesSchema),
  requirePermission(permissions.ordersReadAny),
  c.getZones,
);

router.post(
  "/orders/bulk-book",
  validate(v.bulkBookParcelsSchema),
  requirePermission(permissions.ordersManage),
  c.bulkBookParcels,
);

router.post(
  "/orders/:orderNumber/book",
  validate(v.bookParcelSchema),
  requirePermission(permissions.ordersManage),
  c.bookParcel,
);

router.post(
  "/orders/:orderNumber/sync",
  validate(v.trackParcelSchema),
  requirePermission(permissions.ordersManage),
  c.syncOrderCourier,
);


router.get(
  "/orders/:orderNumber/track",
  validate(v.trackParcelSchema),
  requirePermission(permissions.ordersReadAny),
  c.trackParcel,
);

export default router;
