import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { permissions } from "../../auth/authorization.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import * as c from "./controllers/shipment.controller.js";
import * as v from "./validations/shipment.validation.js";
const router = Router();
router.use((req, res, next) => {
  const ownsPath = req.path.startsWith("/admin/shipments") || req.path.startsWith("/admin/orders/");
  return ownsPath ? authenticate(req, res, (error) => error ? next(error) : requirePermission(permissions.shipmentsManage)(req, res, next)) : next();
});
router.get("/admin/shipments", validate(v.listShipment), c.list);
router.post("/admin/orders/:orderNumber/shipment", validate(v.createShipment), c.create);
router.get("/admin/orders/:orderNumber/shipment", validate(v.orderNumber), c.get);
router.patch("/admin/orders/:orderNumber/shipment", validate(v.updateShipment), c.update);
router.post("/admin/orders/:orderNumber/shipment/transition", validate(v.transitionShipment), c.transition);
export default router;
