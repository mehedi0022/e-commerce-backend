import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../services/category-attribute.service.js";

export const list = asyncHandler(async (req, res) => {
  res.json(
    successResponse(
      "Category attributes fetched successfully",
      await service.list(Number(req.params.categoryId)),
    ),
  );
});

export const replace = asyncHandler(async (req, res) => {
  res.json(
    successResponse(
      "Category attributes updated successfully",
      await service.replace(Number(req.params.categoryId), req.body.attributes),
    ),
  );
});
