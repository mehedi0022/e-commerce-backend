import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from "../../../middlewares/auth.middleware.js";
import * as roleService from "../services/role.service.js";

const getAuth = (req: Request): AuthenticatedUser =>
  (req as AuthenticatedRequest).auth;

export const getAllRoles = asyncHandler(
  async (_req: Request, res: Response) => {
    const roles = await roleService.getAllRoles();
    res.status(200).json(successResponse("Roles fetched successfully", roles));
  },
);

export const getRoleById = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.getRoleById(Number(req.params.id));
  res.status(200).json(successResponse("Role fetched successfully", role));
});

export const getAllPermissions = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await roleService.getAllPermissions();
    res
      .status(200)
      .json(successResponse("Permissions fetched successfully", result));
  },
);

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const actor = getAuth(req);
  const role = await roleService.createRole(actor, req.body);
  res.status(201).json(successResponse("Role created successfully", role));
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const actor = getAuth(req);
  const role = await roleService.updateRole(
    actor,
    Number(req.params.id),
    req.body,
  );
  res.status(200).json(successResponse("Role updated successfully", role));
});

export const updateRolePermissions = asyncHandler(
  async (req: Request, res: Response) => {
    const actor = getAuth(req);
    const role = await roleService.updateRolePermissions(
      actor,
      Number(req.params.id),
      req.body,
    );
    res
      .status(200)
      .json(successResponse("Role permissions updated successfully", role));
  },
);

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const actor = getAuth(req);
  const result = await roleService.deleteRole(actor, Number(req.params.id));
  res.status(200).json(successResponse("Role deleted successfully", result));
});
