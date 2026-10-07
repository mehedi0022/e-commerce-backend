import {
  ValidationError,
  ConflictError,
  NotFoundError,
  AuthorizationError,
} from "../../../errors/AppError.js";
import type { AuthenticatedUser } from "../../../middlewares/auth.middleware.js";
import * as roleRepository from "../repositories/role.repository.js";
import type {
  CreateRoleInput,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from "../role.types.js";

export const getAllRoles = async () => {
  return roleRepository.findAllRoles();
};

export const getRoleById = async (id: number) => {
  const role = await roleRepository.findRoleById(id);
  if (!role) {
    throw new NotFoundError("Role not found");
  }
  return role;
};

export const getAllPermissions = async () => {
  const permissions = await roleRepository.findAllPermissions();

  // Group by module for convenient UI rendering
  const grouped = permissions.reduce<
    Record<string, Array<{ id: number; key: string; action: string; description: string | null }>>
  >((acc, p) => {
    if (!acc[p.module]) {
      acc[p.module] = [];
    }
    acc[p.module].push({
      id: p.id,
      key: p.key,
      action: p.action,
      description: p.description,
    });
    return acc;
  }, {});

  return {
    permissions,
    grouped,
  };
};

export const createRole = async (
  actor: AuthenticatedUser,
  data: CreateRoleInput,
) => {
  if (actor.roleRank < 8 && actor.roleRank <= data.rank) {
    throw new AuthorizationError(
      "You cannot create a role with a rank equal to or higher than your own",
    );
  }

  const existingByKey = await roleRepository.findRoleByKey(data.key);
  if (existingByKey) {
    throw new ConflictError(`Role key '${data.key}' is already in use`);
  }

  const existingByName = await roleRepository.findRoleByName(data.name);
  if (existingByName) {
    throw new ConflictError(`Role name '${data.name}' is already in use`);
  }

  const existingByRank = await roleRepository.findRoleByRank(data.rank);
  if (existingByRank) {
    throw new ConflictError(`Rank ${data.rank} is already assigned to role '${existingByRank.name}'`);
  }

  return roleRepository.createRole(data);
};

export const updateRole = async (
  actor: AuthenticatedUser,
  id: number,
  data: UpdateRoleInput,
) => {
  const role = await roleRepository.findRoleById(id);
  if (!role) {
    throw new NotFoundError("Role not found");
  }

  if (role.isSystem && data.rank !== undefined && data.rank !== role.rank) {
    throw new ValidationError("System role ranks cannot be changed");
  }

  if (actor.roleRank < 8 && actor.roleRank <= role.rank) {
    throw new AuthorizationError(
      "You cannot modify a role with a rank equal to or higher than your own",
    );
  }

  if (data.name && data.name !== role.name) {
    const existing = await roleRepository.findRoleByName(data.name);
    if (existing && existing.id !== id) {
      throw new ConflictError(`Role name '${data.name}' already exists`);
    }
  }

  if (data.rank !== undefined && data.rank !== role.rank) {
    const existing = await roleRepository.findRoleByRank(data.rank);
    if (existing && existing.id !== id) {
      throw new ConflictError(
        `Rank ${data.rank} is already assigned to role '${existing.name}'`,
      );
    }
  }

  return roleRepository.updateRole(id, data);
};

export const updateRolePermissions = async (
  actor: AuthenticatedUser,
  id: number,
  data: UpdateRolePermissionsInput,
) => {
  const role = await roleRepository.findRoleById(id);
  if (!role) {
    throw new NotFoundError("Role not found");
  }

  if (actor.roleRank < 8 && actor.roleRank <= role.rank) {
    throw new AuthorizationError(
      "You cannot modify permissions for a role with equal or higher rank",
    );
  }

  // Ensure SUPER_ADMIN cannot accidentally remove rbac:roles:manage
  if (role.key === "SUPER_ADMIN") {
    const allPerms = await roleRepository.findAllPermissions();
    const rbacPerm = allPerms.find((p) => p.key === "rbac:roles:manage");
    if (rbacPerm && !data.permissionIds.includes(rbacPerm.id)) {
      data.permissionIds.push(rbacPerm.id);
    }
  }

  await roleRepository.updateRolePermissions(id, data.permissionIds);

  return roleRepository.findRoleById(id);
};

export const deleteRole = async (actor: AuthenticatedUser, id: number) => {
  const role = await roleRepository.findRoleById(id);
  if (!role) {
    throw new NotFoundError("Role not found");
  }

  if (role.isSystem) {
    throw new ValidationError("System default roles cannot be deleted");
  }

  if (actor.roleRank < 8 && actor.roleRank <= role.rank) {
    throw new AuthorizationError(
      "You cannot delete a role with equal or higher rank than your own",
    );
  }

  const userCount = await roleRepository.countUsersInRole(id);
  if (userCount > 0) {
    throw new ConflictError(
      `Cannot delete role because it is assigned to ${userCount} active user(s). Reassign them first.`,
    );
  }

  await roleRepository.deleteRole(id);
  return { id, key: role.key, name: role.name };
};
