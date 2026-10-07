import { Router } from "express";
import { permissions } from "../../auth/authorization.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import * as roleController from "./controllers/role.controller.js";
import * as v from "./validations/role.validation.js";

const router = Router();

router.use(requireAuth);

/**
 * List all roles (accessible by staff who manage roles or assign users)
 */
router.get(
  "/",
  requireAnyPermission(
    permissions.rbacRolesManage,
    permissions.usersReadAny,
    permissions.usersCreate,
    permissions.usersChangeRole,
  ),
  roleController.getAllRoles,
);

/**
 * List all permissions available in the system
 */
router.get(
  "/permissions",
  requirePermission(permissions.rbacRolesManage),
  roleController.getAllPermissions,
);

/**
 * Get role details with full permission assignments
 */
router.get(
  "/:id",
  validate(v.roleIdSchema),
  requirePermission(permissions.rbacRolesManage),
  roleController.getRoleById,
);

/**
 * Create a new custom role
 */
router.post(
  "/",
  validate(v.createRoleSchema),
  requirePermission(permissions.rbacRolesManage),
  roleController.createRole,
);

/**
 * Update role metadata (name, rank)
 */
router.patch(
  "/:id",
  validate(v.updateRoleSchema),
  requirePermission(permissions.rbacRolesManage),
  roleController.updateRole,
);

/**
 * Update role permissions
 */
router.put(
  "/:id/permissions",
  validate(v.updateRolePermissionsSchema),
  requirePermission(permissions.rbacRolesManage),
  roleController.updateRolePermissions,
);

/**
 * Delete a custom role
 */
router.delete(
  "/:id",
  validate(v.roleIdSchema),
  requirePermission(permissions.rbacRolesManage),
  roleController.deleteRole,
);

export default router;
