import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/shipping.controller.js";
import * as v from "./validations/shipping.validation.js";
const router = Router();
router.use((req, res, next) => {
  const ownsPath = ["/addresses", "/shipping-zones", "/shipping-methods", "/shipping/options"]
    .some((prefix) => req.path.startsWith(prefix));
  return ownsPath ? requireAuth(req, res, next) : next();
});
router.get("/addresses", c.addresses); router.post("/addresses", validate(v.createAddress), c.createAddress); router.get("/addresses/:addressId", validate(v.addressId), c.address); router.patch("/addresses/:addressId", validate(v.updateAddress), c.updateAddress); router.delete("/addresses/:addressId", validate(v.addressId), c.deleteAddress); router.patch("/addresses/:addressId/default-shipping", validate(v.addressId), c.defaultShipping); router.patch("/addresses/:addressId/default-billing", validate(v.addressId), c.defaultBilling);
const manage = requirePermission(permissions.shippingManage);
router.get("/shipping-zones", manage, c.zones); router.post("/shipping-zones", manage, validate(v.zoneBody), c.createZone); router.get("/shipping-zones/:zoneId", manage, validate(v.zoneId), c.zone); router.patch("/shipping-zones/:zoneId", manage, validate(v.zoneId), c.updateZone); router.delete("/shipping-zones/:zoneId", manage, validate(v.zoneId), c.deleteZone);
router.get("/shipping-zones/:zoneId/areas", manage, validate(v.zoneId), c.areas); router.post("/shipping-zones/:zoneId/areas", manage, validate(v.areaBody), c.createArea); router.patch("/shipping-zones/:zoneId/areas/:areaId", manage, validate(v.areaUpdate), c.updateArea); router.delete("/shipping-zones/:zoneId/areas/:areaId", manage, validate(v.zoneAreaId), c.deleteArea);
router.post("/shipping-zones/:zoneId/methods", manage, validate(v.zoneMethodBody), c.createZoneMethod);
router.get("/shipping-methods", manage, c.methods); router.post("/shipping-methods", manage, validate(v.methodBody), c.createMethod); router.get("/shipping-methods/:methodId", manage, validate(v.methodId), c.method); router.patch("/shipping-methods/:methodId", manage, validate(v.methodId), c.updateMethod); router.delete("/shipping-methods/:methodId", manage, validate(v.methodId), c.deleteMethod);
router.get("/shipping/options", validate(v.optionQuery), c.options);
export default router;
