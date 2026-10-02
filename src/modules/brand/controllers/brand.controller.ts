import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  paginatedResponse,
  successResponse,
} from "../../../utils/api-response.js";
import * as service from "../services/brand.service.js";
export const uploadLogo = asyncHandler(async (req, res) => res.json(successResponse("Brand logo updated successfully", await service.uploadLogo(Number(req.params.id), req.file))));

export const list = asyncHandler(async (req, res) => {
  const result = await service.list(req.query as any);
  res.json(
    paginatedResponse(
      "Brands fetched successfully",
      result.brands,
      result.meta,
    ),
  );
});

export const get = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Brand fetched successfully",
      await service.get(Number(req.params.id)),
    ),
  ),
);

export const create = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Brand created successfully",
        await service.create(req.body),
      ),
    ),
);

export const update = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Brand updated successfully",
      await service.update(Number(req.params.id), req.body),
    ),
  ),
);

export const remove = asyncHandler(async (req, res) => {
  await service.remove(Number(req.params.id));
  res.json(successResponse("Brand deleted successfully", null));
});

export const status = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Brand status updated successfully",
      await service.status(Number(req.params.id), req.body.isActive),
    ),
  ),
);

export const reorder = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Brand reordered successfully",
      await service.reorder(Number(req.params.id), req.body),
    ),
  ),
);
