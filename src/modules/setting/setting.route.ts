import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/setting.controller.js";
import * as v from "./validations/setting.validation.js";

const router = Router();

// Publicly accessible so customer order invoices and packing slips can read official branding
router.get("/invoice", c.getInvoiceSettings);

// Admin updates require auth and permissions
router.put(
  "/invoice",
  requireAuth,
  requirePermission(permissions.ordersManage),
  validate(v.updateInvoiceSettingsSchema),
  c.updateInvoiceSettings
);

router.post(
  "/invoice/reset",
  requireAuth,
  requirePermission(permissions.ordersManage),
  c.resetInvoiceSettings
);

export default router;
