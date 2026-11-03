import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/incomplete-order.controller.js";
import * as v from "./validations/incomplete-order.validation.js";

const router = Router();

// Public route: Capture lead in real-time from checkout or landing page
router.post("/capture", validate(v.captureIncompleteOrderSchema), c.capture);

// Admin CRM routes
router.use(requireAuth);

router.get("/metrics", requirePermission(permissions.ordersReadAny), c.getMetrics);
router.get("/", validate(v.incompleteOrderQuerySchema), requirePermission(permissions.ordersReadAny), c.list);
router.get("/:id", validate(v.incompleteOrderIdSchema), requirePermission(permissions.ordersReadAny), c.getById);
router.patch("/:id", validate(v.updateIncompleteOrderSchema), requirePermission(permissions.ordersManage), c.update);
router.post("/:id/convert", validate(v.convertIncompleteOrderSchema), requirePermission(permissions.ordersManage), c.convert);

export default router;
