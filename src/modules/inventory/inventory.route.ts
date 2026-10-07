import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/inventory.controller.js";
import * as v from "./validations/inventory.validation.js";
const router = Router();

router.use((req, res, next) =>
  req.path.startsWith("/variants/") || req.path.startsWith("/inventory")
    ? requireAuth(req, res, next)
    : next(),
);

// Global inventory overview & statistics
router.get(
  "/inventory",
  validate(v.inventoryListQuerySchema),
  requirePermission(permissions.inventoryReadAny),
  c.list,
);

// Global inventory movement audit log
router.get(
  "/inventory/movements",
  validate(v.globalMovementsQuerySchema),
  requirePermission(permissions.inventoryReadAny),
  c.globalHistory,
);

// Per-variant inventory routes
router.post(
  "/variants/:variantId/inventory/initialize",
  validate(v.initializeSchema),
  requirePermission(permissions.inventoryManage),
  c.initialize,
);
router.get(
  "/variants/:variantId/inventory",
  validate(v.variantIdSchema),
  requirePermission(permissions.inventoryReadAny),
  c.get,
);
router.post(
  "/variants/:variantId/inventory/restock",
  validate(v.quantitySchema),
  requirePermission(permissions.inventoryManage),
  c.restock,
);
router.post(
  "/variants/:variantId/inventory/damage",
  validate(v.quantitySchema),
  requirePermission(permissions.inventoryManage),
  c.damage,
);
router.post(
  "/variants/:variantId/inventory/adjust",
  validate(v.adjustmentSchema),
  requirePermission(permissions.inventoryManage),
  c.adjust,
);
router.patch(
  "/variants/:variantId/inventory/threshold",
  validate(v.thresholdSchema),
  requirePermission(permissions.inventoryManage),
  c.updateThreshold,
);
router.get(
  "/variants/:variantId/inventory/movements",
  validate(v.movementQuerySchema),
  requirePermission(permissions.inventoryReadAny),
  c.history,
);
export default router;
