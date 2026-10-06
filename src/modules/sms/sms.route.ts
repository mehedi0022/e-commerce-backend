import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/sms.controller.js";
import * as v from "./validations/sms.validation.js";

const router = Router();

// All notification management endpoints require Admin permission
router.use(requireAuth);

// Providers
router.get(
  "/providers",
  requirePermission(permissions.ordersReadAny),
  c.listProviders,
);

router.post(
  "/providers",
  validate(v.createProviderSchema),
  requirePermission(permissions.ordersManage),
  c.createProvider,
);

router.get(
  "/providers/:id",
  validate(v.providerIdSchema),
  requirePermission(permissions.ordersReadAny),
  c.getProvider,
);

router.patch(
  "/providers/:id",
  validate(v.updateProviderSchema),
  requirePermission(permissions.ordersManage),
  c.updateProvider,
);

router.delete(
  "/providers/:id",
  validate(v.providerIdSchema),
  requirePermission(permissions.ordersManage),
  c.deleteProvider,
);

router.get(
  "/providers/:id/balance",
  validate(v.providerIdSchema),
  requirePermission(permissions.ordersReadAny),
  c.checkBalance,
);

// Templates
router.get(
  "/templates",
  requirePermission(permissions.ordersReadAny),
  c.listTemplates,
);

router.patch(
  "/templates/:event",
  validate(v.updateTemplateSchema),
  requirePermission(permissions.ordersManage),
  c.updateTemplate,
);

// Test SMS
router.post(
  "/test-sms",
  validate(v.testSmsSchema),
  requirePermission(permissions.ordersManage),
  c.sendTestSms,
);

// Logs
router.get(
  "/logs",
  requirePermission(permissions.ordersReadAny),
  c.listLogs,
);

export default router;
