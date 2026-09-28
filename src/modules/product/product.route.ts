import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/product.controller.js";
import * as v from "./validations/product.validation.js";
import * as vv from "./validations/product-variant.validation.js";
import * as vc from "./controllers/product-variant.controller.js";
const router = Router();

router.use(requireAuth);
router.get("/:productId/variants", validate(vv.variantListSchema), requirePermission(permissions.productsReadAny), vc.list);
router.get("/:productId/variants/:variantId", validate(vv.variantParamsSchema), requirePermission(permissions.productsReadAny), vc.get);
router.post("/:productId/variants", validate(vv.createVariantSchema), requirePermission(permissions.productsUpdateAny), vc.create);
router.patch("/:productId/variants/:variantId", validate(vv.updateVariantSchema), requirePermission(permissions.productsUpdateAny), vc.update);
router.delete("/:productId/variants/:variantId", validate(vv.variantParamsSchema), requirePermission(permissions.productsDeleteAny), vc.remove);

router.get(
  "/",
  validate(v.productListQuerySchema),
  requirePermission(permissions.productsReadAny),
  c.list,
);

router.get(
  "/:id",
  validate(v.productIdSchema),
  requirePermission(permissions.productsReadAny),
  c.get,
);

router.post(
  "/",
  validate(v.createProductSchema),
  requirePermission(permissions.productsCreate),
  c.create,
);

router.patch(
  "/:id",
  validate(v.updateProductSchema),
  requirePermission(permissions.productsUpdateAny),
  c.update,
);

router.patch(
  "/:id/status",
  validate(v.productStatusSchema),
  requirePermission(permissions.productsUpdateAny),
  c.status,
);

router.delete(
  "/:id",
  validate(v.productIdSchema),
  requirePermission(permissions.productsDeleteAny),
  c.remove,
);

export default router;
