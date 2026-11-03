import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/size-chart.controller.js";
import * as v from "./validations/size-chart.validation.js";

const router = Router();

// Public routes for storefront
router.get("/public", c.list);
router.get("/public/:id", validate(v.sizeChartIdSchema), c.get);

// Admin routes
router.use(requireAuth);

router.get("/", requirePermission(permissions.productsReadAny), c.list);
router.get("/:id", validate(v.sizeChartIdSchema), requirePermission(permissions.productsReadAny), c.get);
router.post("/", validate(v.createSizeChartSchema), requirePermission(permissions.productsCreate), c.create);
router.patch("/:id", validate(v.updateSizeChartSchema), requirePermission(permissions.productsUpdateAny), c.update);
router.delete("/:id", validate(v.sizeChartIdSchema), requirePermission(permissions.productsDeleteAny), c.remove);

export default router;
