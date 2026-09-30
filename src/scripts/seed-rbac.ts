import { closeDatabase, db } from "../prisma/db.js";
import { permissions } from "../auth/authorization.js";

const roles = [
  {
    key: "CUSTOMER",
    name: "Customer",
    rank: 1,
  },
  {
    key: "SELLER",
    name: "Seller",
    rank: 2,
  },
  {
    key: "AUTHOR",
    name: "Author",
    rank: 3,
  },
  {
    key: "EDITOR",
    name: "Editor",
    rank: 4,
  },
  {
    key: "MODERATOR",
    name: "Moderator",
    rank: 5,
  },
  {
    key: "MANAGER",
    name: "Manager",
    rank: 6,
  },
  {
    key: "ADMIN",
    name: "Admin",
    rank: 7,
  },
  {
    key: "SUPER_ADMIN",
    name: "Super Admin",
    rank: 8,
  },
] as const;

const permissionDefinitions = [
  {
    key: permissions.usersReadAny,
    module: "users",
    action: "read:any",
    description: "View any user",
  },
  {
    key: permissions.usersCreate,
    module: "users",
    action: "create",
    description: "Create a user",
  },
  {
    key: permissions.usersUpdateAny,
    module: "users",
    action: "update:any",
    description: "Update any user",
  },
  {
    key: permissions.usersDeleteAny,
    module: "users",
    action: "delete:any",
    description: "Delete any user",
  },
  {
    key: permissions.usersChangeRole,
    module: "users",
    action: "change-role",
    description: "Change a user's role",
  },
  {
    key: permissions.usersChangeStatus,
    module: "users",
    action: "change-status",
    description: "Activate or deactivate a user",
  },
  {
    key: permissions.usersResetPassword,
    module: "users",
    action: "reset-password",
    description: "Reset a user's password",
  },
  {
    key: permissions.rbacRolesManage,
    module: "rbac",
    action: "roles:manage",
    description: "Manage role permission assignments",
  },
  {
    key: permissions.rbacPermissionsManage,
    module: "rbac",
    action: "permissions:manage",
    description: "Create and manage permissions",
  },
  ...([
    [permissions.categoriesReadAny, "read:any", "View categories"],
    [permissions.categoriesCreate, "create", "Create categories"],
    [permissions.categoriesUpdateAny, "update:any", "Update categories"],
    [permissions.categoriesDeleteAny, "delete:any", "Delete categories"],
    [permissions.categoriesChangeStatus, "change-status", "Activate or deactivate categories"],
    [permissions.categoriesReorder, "reorder", "Reorder categories"],
  ] as const).map(([key, action, description]) => ({ key, module: "categories", action, description })),
  ...([
    [permissions.brandsReadAny, "read:any", "View brands"],
    [permissions.brandsCreate, "create", "Create brands"],
    [permissions.brandsUpdateAny, "update:any", "Update brands"],
    [permissions.brandsDeleteAny, "delete:any", "Delete brands"],
    [permissions.brandsChangeStatus, "change-status", "Activate or deactivate brands"],
    [permissions.brandsReorder, "reorder", "Reorder brands"],
  ] as const).map(([key, action, description]) => ({ key, module: "brands", action, description })),
  ...([
    [permissions.attributesReadAny, "read:any", "View attributes"],
    [permissions.attributesCreate, "create", "Create attributes"],
    [permissions.attributesUpdateAny, "update:any", "Update attributes"],
    [permissions.attributesDeleteAny, "delete:any", "Delete attributes"],
    [permissions.attributesChangeStatus, "change-status", "Activate or deactivate attributes"],
    [permissions.attributeValuesCreate, "values:create", "Create attribute values"],
    [permissions.attributeValuesUpdate, "values:update", "Update attribute values"],
    [permissions.attributeValuesDelete, "values:delete", "Delete attribute values"],
  ] as const).map(([key, action, description]) => ({ key, module: "attributes", action, description })),
  ...([
    [permissions.productsReadAny, "read:any", "View products"],
    [permissions.productsCreate, "create", "Create products"],
    [permissions.productsUpdateAny, "update:any", "Update products"],
    [permissions.productsDeleteAny, "delete:any", "Delete products"],
  ] as const).map(([key, action, description]) => ({ key, module: "products", action, description })),
  {
    key: permissions.inventoryReadAny,
    module: "inventory",
    action: "read:any",
    description: "View inventory and movement history",
  },
  {
    key: permissions.inventoryManage,
    module: "inventory",
    action: "manage",
    description: "Manage stock operations",
  },
  {
    key: permissions.shippingManage,
    module: "shipping",
    action: "manage",
    description: "Manage shipping zones and methods",
  },
  {
    key: permissions.couponsManage,
    module: "coupons",
    action: "manage",
    description: "Manage coupon configuration and usage",
  },
  {
    key: permissions.ordersReadAny,
    module: "orders",
    action: "read:any",
    description: "View customer orders",
  },
  {
    key: permissions.ordersManage,
    module: "orders",
    action: "manage",
    description: "Manage order status transitions",
  },
  { key: permissions.shipmentsManage, module: "shipments", action: "manage", description: "Manage shipment fulfillment and delivery" },
  { key: permissions.returnsRead, module: "returns", action: "read", description: "View returns" },
  { key: permissions.returnsTransition, module: "returns", action: "transition", description: "Transition returns" },
  { key: permissions.returnsInspect, module: "returns", action: "inspect", description: "Inspect returned items" },
  { key: permissions.refundsRead, module: "refunds", action: "read", description: "View refunds" },
  { key: permissions.refundsCreate, module: "refunds", action: "create", description: "Create refunds" },
  { key: permissions.refundsTransition, module: "refunds", action: "transition", description: "Transition refunds" },
  { key: permissions.reviewsRead, module: "reviews", action: "read", description: "View reviews" },
  { key: permissions.reviewsModerate, module: "reviews", action: "moderate", description: "Approve or reject reviews" },
  { key: permissions.navigationReadAny, module: "navigation", action: "read:any", description: "View navigation menus" },
  { key: permissions.navigationManage, module: "navigation", action: "manage", description: "Manage navigation menus and items" },
  { key: permissions.slidersReadAny, module: "sliders", action: "read:any", description: "View sliders" },
  { key: permissions.slidersManage, module: "sliders", action: "manage", description: "Manage sliders" },
  { key: permissions.popupsReadAny, module: "popups", action: "read:any", description: "View popups" },
  { key: permissions.popupsManage, module: "popups", action: "manage", description: "Manage popups" },
] as const;

const privilegedRoleKeys = new Set(["ADMIN", "SUPER_ADMIN"]);

const seedRbac = async () =>
  db.transaction(async (tx) => {
    const roleIds = new Map<string, number>();
    const permissionIds = new Map<string, number>();

    for (const role of roles) {
      const existing = await tx.orm.public.Role.first({
        key: role.key,
      });

      const saved = existing
        ? await tx.orm.public.Role.where({
            id: existing.id,
          }).update({
            ...role,
            isSystem: true,
          })
        : await tx.orm.public.Role.create({
            ...role,
            isSystem: true,
          });

      if (!saved) {
        throw new Error(`Could not seed role: ${role.key}`);
      }

      roleIds.set(role.key, saved.id);
    }

    /**
     * Seed application permissions.
     */
    for (const permission of permissionDefinitions) {
      const existing = await tx.orm.public.Permission.first({
        key: permission.key,
      });

      const saved = existing
        ? await tx.orm.public.Permission.where({
            id: existing.id,
          }).update(permission)
        : await tx.orm.public.Permission.create(permission);

      if (!saved) {
        throw new Error(`Could not seed permission: ${permission.key}`);
      }

      permissionIds.set(permission.key, saved.id);
    }

    /**
     * Seed default role-permission assignments.
     */
    for (const roleKey of privilegedRoleKeys) {
      const roleId = roleIds.get(roleKey);

      if (roleId === undefined) {
        throw new Error(`Seed role not found: ${roleKey}`);
      }

      for (const [permissionKey, permissionId] of permissionIds) {
        /**
         * ADMIN receives user-management permissions,
         * but RBAC management remains SUPER_ADMIN-only
         * by default.
         */
        if (roleKey !== "SUPER_ADMIN" && permissionKey.startsWith("rbac:")) {
          continue;
        }

        const existing = await tx.orm.public.RolePermission.first({
          roleId,
          permissionId,
        });

        if (!existing) {
          await tx.orm.public.RolePermission.create({
            roleId,
            permissionId,
          });
        }
      }
    }

    return {
      roles: roleIds.size,
      permissions: permissionIds.size,
    };
  });

try {
  const result = await seedRbac();

  console.log(
    `RBAC seeded: ${result.roles} roles, ${result.permissions} permissions.`,
  );
} finally {
  await closeDatabase();
}
