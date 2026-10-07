import { Router } from "express";
import { permissions } from "../../auth/authorization.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import {
  getCustomers,
  getCustomerById,
  changeCustomerStatus,
} from "./controllers/customer.controller.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requirePermission(permissions.usersReadAny),
  getCustomers
);

router.get(
  "/:id",
  requirePermission(permissions.usersReadAny),
  getCustomerById
);

router.patch(
  "/:id/status",
  requirePermission(permissions.usersChangeStatus),
  changeCustomerStatus
);

export default router;
