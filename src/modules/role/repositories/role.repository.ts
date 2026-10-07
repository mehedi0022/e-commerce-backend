import { db } from "../../../prisma/db.js";
import type {
  CreateRoleInput,
  PermissionItem,
  RoleDetail,
  RoleListItem,
  UpdateRoleInput,
} from "../role.types.js";

export const findAllRoles = async (): Promise<RoleListItem[]> => {
  const roles = await db.orm.public.Role.select(
    "id",
    "key",
    "name",
    "rank",
    "isSystem",
    "createdAt",
    "updatedAt",
  )
    .include("rolePermissions", (rp) =>
      rp.include("permission", (p) =>
        p.select("id", "key", "module", "action", "description"),
      ),
    )
    .include("users", (u) => u.select("id"))
    .orderBy((r: any) => r.rank.desc())
    .all();

  return roles.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    rank: role.rank,
    isSystem: role.isSystem,
    userCount: role.users?.length ?? 0,
    permissionCount: role.rolePermissions?.length ?? 0,
    permissions:
      role.rolePermissions?.flatMap((rp) =>
        rp.permission ? [rp.permission.key] : [],
      ) ?? [],
    createdAt: role.createdAt.toString(),
    updatedAt: role.updatedAt.toString(),
  }));
};

export const findRoleById = async (id: number): Promise<RoleDetail | null> => {
  const role = await db.orm.public.Role.select(
    "id",
    "key",
    "name",
    "rank",
    "isSystem",
    "createdAt",
    "updatedAt",
  )
    .include("rolePermissions", (rp) =>
      rp.include("permission", (p) =>
        p.select("id", "key", "module", "action", "description"),
      ),
    )
    .include("users", (u) =>
      u.select("id", "fullName", "email", "isActive"),
    )
    .first({ id });

  if (!role) {
    return null;
  }

  const permissions: PermissionItem[] =
    role.rolePermissions?.flatMap((rp) =>
      rp.permission
        ? [
            {
              id: rp.permission.id,
              key: rp.permission.key,
              module: rp.permission.module,
              action: rp.permission.action,
              description: rp.permission.description,
            },
          ]
        : [],
    ) ?? [];

  return {
    id: role.id,
    key: role.key,
    name: role.name,
    rank: role.rank,
    isSystem: role.isSystem,
    userCount: role.users?.length ?? 0,
    users:
      role.users?.map((u) => ({
        id: u.id,
        fullName: u.fullName ?? "",
        email: u.email,
        isActive: u.isActive,
      })) ?? [],
    permissions,
    permissionIds: permissions.map((p) => p.id),
    permissionKeys: permissions.map((p) => p.key),
    createdAt: role.createdAt.toString(),
    updatedAt: role.updatedAt.toString(),
  };
};

export const findRoleByKey = async (key: string) => {
  return db.orm.public.Role.first({ key });
};

export const findRoleByName = async (name: string) => {
  return db.orm.public.Role.first({ name });
};

export const findRoleByRank = async (rank: number) => {
  return db.orm.public.Role.first({ rank });
};

export const findAllPermissions = async (): Promise<PermissionItem[]> => {
  const permissions = await db.orm.public.Permission.select(
    "id",
    "key",
    "module",
    "action",
    "description",
  )
    .orderBy((p: any) => p.module.asc())
    .all();

  return permissions.map((p) => ({
    id: p.id,
    key: p.key,
    module: p.module,
    action: p.action,
    description: p.description,
  }));
};

export const createRole = async (data: CreateRoleInput) => {
  return db.transaction(async (tx) => {
    const role = await tx.orm.public.Role.create({
      key: data.key,
      name: data.name,
      rank: data.rank,
      isSystem: false,
    });

    if (data.permissionIds && data.permissionIds.length > 0) {
      for (const permissionId of data.permissionIds) {
        await tx.orm.public.RolePermission.create({
          roleId: role.id,
          permissionId,
        });
      }
    }

    return role;
  });
};

export const updateRole = async (id: number, data: UpdateRoleInput) => {
  return db.orm.public.Role.where({ id }).update(data);
};

export const updateRolePermissions = async (
  roleId: number,
  permissionIds: number[],
) => {
  return db.transaction(async (tx) => {
    // Delete existing permissions one by one until none match
    while (await tx.orm.public.RolePermission.where({ roleId }).delete()) {}

    // Deduplicate and re-assign
    const uniqueIds = Array.from(new Set(permissionIds));
    for (const permissionId of uniqueIds) {
      await tx.orm.public.RolePermission.create({
        roleId,
        permissionId,
      });
    }

    return true;
  });
};

export const deleteRole = async (id: number) => {
  return db.transaction(async (tx) => {
    while (await tx.orm.public.RolePermission.where({ roleId: id }).delete()) {}
    return tx.orm.public.Role.where({ id }).delete();
  });
};

export const countUsersInRole = async (roleId: number): Promise<number> => {
  const users = await db.orm.public.User.select("id").where({ roleId }).all();
  return users.length;
};
