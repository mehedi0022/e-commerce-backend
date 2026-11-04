import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { permissions } from "../../auth/authorization.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import rateLimit from "express-rate-limit";
import * as c from "./controllers/order.controller.js";
import { guestOrderSchema, manualOrderSchema, orderListSchema, orderNumberSchema, orderTransitionSchema, trackOrderSchema, updateAdminOrderSchema } from "./validations/order.validation.js";

const router = Router();

const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
});

router.get("/orders/track", trackLimiter, validate(trackOrderSchema), c.track);
router.get("/orders/guest/:orderNumber", validate(guestOrderSchema), c.guestDetail);
router.use((req, res, next) => {
  if (req.path === "/orders/track") return next();
  const ownsPath = req.path.startsWith("/orders") || req.path.startsWith("/admin/orders");
  return ownsPath ? authenticate(req, res, next) : next();
});
router.get("/orders", validate(orderListSchema), c.list);
router.get("/orders/:orderNumber", validate(orderNumberSchema), c.detail);
router.get("/admin/orders", validate(orderListSchema), requirePermission(permissions.ordersReadAny), c.adminList);
router.get("/admin/orders/counts", requirePermission(permissions.ordersReadAny), c.adminStatusCounts);
router.get("/admin/orders/pos/products", requirePermission(permissions.ordersManage), c.searchPosProducts);
router.get("/admin/orders/pos/customers", requirePermission(permissions.ordersManage), c.searchPosCustomers);
router.post("/admin/orders/manual", validate(manualOrderSchema), requirePermission(permissions.ordersManage), c.createManualOrder);
router.get("/admin/orders/:orderNumber", validate(orderNumberSchema), requirePermission(permissions.ordersReadAny), c.adminDetail);
router.patch("/admin/orders/:orderNumber", validate(updateAdminOrderSchema), requirePermission(permissions.ordersManage), c.updateAdmin);
router.patch("/admin/orders/:orderNumber/status", validate(orderTransitionSchema), requirePermission(permissions.ordersManage), c.transition);
export default router;
