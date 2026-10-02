import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { imageUpload } from "../upload/upload.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/product-image.controller.js";
import * as v from "./validations/product-image.route.validation.js";
import { imageMetadataSchema } from "./validations/product-image.validation.js";
const router = Router();
router.use((req, res, next) =>
  req.path.startsWith("/products/") ? requireAuth(req, res, next) : next(),
);
router.get("/products/:productId/images", validate(v.productImages), requirePermission(permissions.productsReadAny), c.list);
router.post("/products/:productId/images", validate(v.productImages), requirePermission(permissions.productsUpdateAny), imageUpload.single("image"), validate(imageMetadataSchema), c.create);
router.patch("/products/:productId/images/:imageId", validate(v.imageId), requirePermission(permissions.productsUpdateAny), imageUpload.single("image"), validate(imageMetadataSchema), c.update);
router.delete("/products/:productId/images/:imageId", validate(v.imageId), requirePermission(permissions.productsUpdateAny), c.remove);
export default router;
