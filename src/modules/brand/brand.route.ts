import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/brand.controller.js";
import * as v from "./validations/brand.validation.js";
import { imageUpload } from "../upload/upload.middleware.js";

const router = Router();

// Public route for storefront
router.get("/public", validate(v.brandListQuerySchema), c.list);

router.use(requireAuth);
router.post("/:id/logo", validate(v.brandIdSchema), requirePermission(permissions.brandsUpdateAny), imageUpload.single("image"), c.uploadLogo);

router.get(
  "/",
  validate(v.brandListQuerySchema),
  requirePermission(permissions.brandsReadAny),
  c.list,
);

router.get(
  "/:id",
  validate(v.brandIdSchema),
  requirePermission(permissions.brandsReadAny),
  c.get,
);

router.post(
  "/",
  validate(v.createBrandSchema),
  requirePermission(permissions.brandsCreate),
  c.create,
);

router.patch(
  "/:id",
  validate(v.updateBrandSchema),
  requirePermission(permissions.brandsUpdateAny),
  c.update,
);

router.patch(
  "/:id/status",
  validate(v.brandStatusSchema),
  requirePermission(permissions.brandsChangeStatus),
  c.status,
);

router.patch(
  "/:id/reorder",
  validate(v.reorderBrandSchema),
  requirePermission(permissions.brandsReorder),
  c.reorder,
);

router.delete(
  "/:id",
  validate(v.brandIdSchema),
  requirePermission(permissions.brandsDeleteAny),
  c.remove,
);

export default router;
