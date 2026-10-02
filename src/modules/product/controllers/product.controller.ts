import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  paginatedResponse,
  successResponse,
} from "../../../utils/api-response.js";
import * as service from "../services/product.service.js";

export const list = asyncHandler(async (req, res) => {
  const x = await service.list(req.query as any);
  res.json(
    paginatedResponse("Products fetched successfully", x.products, x.meta),
  );
});

export const publicList = asyncHandler(async (req, res) => {
  const x = await service.publicList(req.query as any);
  res.json(paginatedResponse("Products fetched successfully", x.products, x.meta));
});

export const publicGetBySlug = asyncHandler(async (req, res) =>
  res.json(successResponse("Product fetched successfully", await service.publicGetBySlug(String(req.params.slug)))),
);

export const get = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Product fetched successfully",
      await service.get(Number(req.params.id)),
    ),
  ),
);

export const create = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Product created successfully",
        await service.create(req.body),
      ),
    ),
);

export const update = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Product updated successfully",
      await service.update(Number(req.params.id), req.body),
    ),
  ),
);

export const remove = asyncHandler(async (req, res) => {
  await service.remove(Number(req.params.id));
  res.json(successResponse("Product deleted successfully", null));
});

export const status = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Product status updated successfully",
      await service.status(Number(req.params.id), req.body.status),
    ),
  ),
);
