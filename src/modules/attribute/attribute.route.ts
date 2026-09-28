import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import * as c from "./controllers/attribute.controller.js";
import * as v from "./validations/attribute.validation.js";
const router = Router();
router.use(requireAuth);
router.post(
  "/",
  validate(v.createAttributeSchema),
  requirePermission(permissions.attributesCreate),
  c.create,
);
router.get(
  "/",
  validate(v.attributeListQuerySchema),
  requirePermission(permissions.attributesReadAny),
  c.list,
);
router.get(
  "/:id",
  validate(v.attributeIdSchema),
  requirePermission(permissions.attributesReadAny),
  c.get,
);
router.patch(
  "/:id",
  validate(v.updateAttributeSchema),
  requirePermission(permissions.attributesUpdateAny),
  c.update,
);
router.patch(
  "/:id/status",
  validate(v.attributeStatusSchema),
  requirePermission(permissions.attributesChangeStatus),
  c.status,
);
router.delete(
  "/:id",
  validate(v.attributeIdSchema),
  requirePermission(permissions.attributesDeleteAny),
  c.remove,
);
router.post(
  "/:attributeId/values",
  validate(v.createValueSchema),
  requirePermission(permissions.attributeValuesCreate),
  c.createValue,
);
router.get(
  "/:attributeId/values",
  validate(v.attributeValueListSchema),
  requirePermission(permissions.attributesReadAny),
  c.listValues,
);
router.patch(
  "/:attributeId/values/:valueId",
  validate(v.updateValueSchema),
  requirePermission(permissions.attributeValuesUpdate),
  c.updateValue,
);
router.delete(
  "/:attributeId/values/:valueId",
  validate(v.valueIdSchema),
  requirePermission(permissions.attributeValuesDelete),
  c.removeValue,
);
export default router;
