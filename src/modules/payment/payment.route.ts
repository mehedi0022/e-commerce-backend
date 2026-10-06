import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/payment.controller.js";
import * as v from "./validations/payment.validation.js";

const router = Router();

// ─── Public routes for Storefront Checkout ──────────────────────────────────
router.get("/public", c.getPublic);

// ─── Automated Gateway Callbacks & IPN (Public endpoints called by Gateways) ─
router.all("/gateway/:code/callback", c.handleGatewayCallback);
router.all("/gateway/:code/ipn", c.handleGatewayCallback);

// Initiate gateway payment session (Authenticated or Guest with Order ID)
router.post("/orders/:orderId/initiate-gateway", c.initiateGateway);

// ─── Protected Admin routes ──────────────────────────────────────────────────
router.use(requireAuth);

router.get(
  "/",
  requirePermission(permissions.ordersReadAny),
  c.getAdminList,
);

router.get(
  "/orders/:orderId/transactions",
  validate(v.orderPaymentParamsSchema),
  requirePermission(permissions.ordersReadAny),
  c.getOrderTransactions,
);

router.post(
  "/transactions/:id/verify",
  validate(v.verifyPaymentSchema),
  requirePermission(permissions.ordersManage),
  c.verifyTransaction,
);

router.get(
  "/:id",
  validate(v.paymentMethodIdSchema),
  requirePermission(permissions.ordersReadAny),
  c.getById,
);

router.post(
  "/",
  validate(v.createPaymentMethodSchema),
  requirePermission(permissions.ordersManage),
  c.create,
);

router.patch(
  "/:id",
  validate(v.updatePaymentMethodSchema),
  requirePermission(permissions.ordersManage),
  c.update,
);

router.delete(
  "/:id",
  validate(v.paymentMethodIdSchema),
  requirePermission(permissions.ordersManage),
  c.remove,
);

export default router;
