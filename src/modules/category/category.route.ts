import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/category.controller.js";
import * as v from "./validations/category.validation.js";
import * as categoryAttributeController from "../attribute/controllers/category-attribute.controller.js";
import * as categoryAttributeValidation from "../attribute/validations/category-attribute.validation.js";


const router = Router();


router.use(requireAuth);
router.get("/:categoryId/attributes", validate(categoryAttributeValidation.categoryAttributesSchema), requirePermission(permissions.categoriesReadAny), categoryAttributeController.list);
router.put("/:categoryId/attributes", validate(categoryAttributeValidation.updateCategoryAttributesSchema), requirePermission(permissions.categoriesUpdateAny), categoryAttributeController.replace);

router.get("/tree", requirePermission(permissions.categoriesReadAny), c.tree);

router.get(
  "/",
  validate(v.categoryListQuerySchema),
  requirePermission(permissions.categoriesReadAny),
  c.list,
);

router.get(
  "/:id",
  validate(v.categoryIdSchema),
  requirePermission(permissions.categoriesReadAny),
  c.get,
);

router.post(
  "/",
  validate(v.createCategorySchema),
  requirePermission(permissions.categoriesCreate),
  c.create,
);

router.patch(
  "/:id",
  validate(v.updateCategorySchema),
  requirePermission(permissions.categoriesUpdateAny),
  c.update,
);

router.patch(
  "/:id/status",
  validate(v.categoryStatusSchema),
  requirePermission(permissions.categoriesChangeStatus),
  c.status,
);

router.patch(
  "/:id/reorder",
  validate(v.reorderCategorySchema),
  requirePermission(permissions.categoriesReorder),
  c.reorder,
);

router.delete(
  "/:id",
  validate(v.categoryIdSchema),
  requirePermission(permissions.categoriesDeleteAny),
  c.remove,
);
export default router;
