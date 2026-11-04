import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/marketing.controller.js";
import * as v from "./marketing.validation.js";

const router = Router();

// Publicly accessible for storefront pixel & GTM initialization (no sensitive tokens returned)
router.get("/public", c.getPublicSettings);

// Admin endpoints
router.get(
  "/",
  requireAuth,
  requirePermission(permissions.ordersManage),
  c.getSettings
);

router.put(
  "/",
  requireAuth,
  requirePermission(permissions.ordersManage),
  validate(v.updateMarketingSettingsSchema),
  c.updateSettings
);

router.post(
  "/test-meta",
  requireAuth,
  requirePermission(permissions.ordersManage),
  validate(v.testMetaCapiSchema),
  c.testMetaCapi
);

export default router;
