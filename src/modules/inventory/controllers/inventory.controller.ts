import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  paginatedResponse,
  successResponse,
} from "../../../utils/api-response.js";
import * as service from "../services/inventory.service.js";
export const initialize = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Inventory initialized successfully",
        await service.initialize(Number(req.params.variantId), req.body),
      ),
    ),
);
export const get = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Inventory fetched successfully",
      await service.get(Number(req.params.variantId)),
    ),
  ),
);
export const restock = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Stock restocked successfully",
      await service.restock(Number(req.params.variantId), req.body),
    ),
  ),
);
export const damage = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Damaged stock recorded successfully",
      await service.damage(Number(req.params.variantId), req.body),
    ),
  ),
);
export const adjust = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Stock adjusted successfully",
      await service.adjust(Number(req.params.variantId), req.body),
    ),
  ),
);
export const history = asyncHandler(async (req, res) => {
  const x = await service.history(
    Number(req.params.variantId),
    req.query as any,
  );
  res.json(
    paginatedResponse(
      "Inventory movements fetched successfully",
      x.rows,
      x.meta,
    ),
  );
});
