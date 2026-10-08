import { Router } from "express";
import { permissions } from "../../auth/authorization.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { getDashboardAnalytics } from "./controllers/analytics.controller.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/dashboard",
  requirePermission(permissions.ordersReadAny),
  getDashboardAnalytics,
);

export default router;
