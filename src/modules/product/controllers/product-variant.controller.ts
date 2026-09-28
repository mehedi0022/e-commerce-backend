import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../services/product-variant.service.js";
export const list = asyncHandler(async (req, res) => res.json(successResponse("Product variants fetched successfully", await service.list(Number(req.params.productId)))));
export const get = asyncHandler(async (req, res) => res.json(successResponse("Product variant fetched successfully", await service.get(Number(req.params.productId), Number(req.params.variantId)))));
export const create = asyncHandler(async (req, res) => res.status(201).json(successResponse("Product variant created successfully", await service.create(Number(req.params.productId), req.body))));
export const update = asyncHandler(async (req, res) => res.json(successResponse("Product variant updated successfully", await service.update(Number(req.params.productId), Number(req.params.variantId), req.body))));
export const remove = asyncHandler(async (req, res) => { await service.remove(Number(req.params.productId), Number(req.params.variantId)); res.json(successResponse("Product variant deleted successfully", null)); });
