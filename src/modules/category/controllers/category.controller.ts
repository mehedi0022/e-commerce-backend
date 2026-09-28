import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  paginatedResponse,
  successResponse,
} from "../../../utils/api-response.js";
import * as service from "../services/category.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as any);
  res.json(
    paginatedResponse(
      "Categories fetched successfully",
      result.categories,
      result.meta,
    ),
  );
});

export const tree = asyncHandler(async (_req, res) =>
  res.json(
    successResponse("Category tree fetched successfully", await service.tree()),
  ),
);

export const get = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Category fetched successfully",
      await service.get(Number(req.params.id)),
    ),
  ),
);

export const create = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Category created successfully",
        await service.create(req.body),
      ),
    ),
);

export const update = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Category updated successfully",
      await service.update(Number(req.params.id), req.body),
    ),
  ),
);

export const remove = asyncHandler(async (req, res) => {
  await service.remove(Number(req.params.id));
  res.json(successResponse("Category deleted successfully", null));
});

export const status = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Category status updated successfully",
      await service.status(Number(req.params.id), req.body.isActive),
    ),
  ),
);

export const reorder = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Category reordered successfully",
      await service.reorder(Number(req.params.id), req.body),
    ),
  ),
);
