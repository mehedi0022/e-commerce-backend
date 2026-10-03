import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/product.controller.js";
import * as v from "./validations/product.validation.js";
import * as vv from "./validations/product-variant.validation.js";
import * as vc from "./controllers/product-variant.controller.js";
import { imageUpload } from "../upload/upload.middleware.js";
import { uploadService } from "../upload/upload.module.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/api-response.js";
import { AuthorizationError, ValidationError } from "../../errors/AppError.js";
const router = Router();

router.get("/public", validate(v.productListQuerySchema), c.publicList);
router.get("/public/slug/:slug", validate(v.publicProductSlugSchema), c.publicGetBySlug);

router.use(requireAuth);
// Independent assets allow description images before a product draft exists.
router.post("/description-images", (req, _res, next) => {
  if (!req.auth?.permissions.some(permission => permission === permissions.productsCreate || permission === permissions.productsUpdateAny)) return next(new AuthorizationError());
  next();
}, imageUpload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError("Image file is required");
  const image = await uploadService.upload(req.file, "product-descriptions");
  res.status(201).json(successResponse("Description image uploaded", { url: image.url }));
}));
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
