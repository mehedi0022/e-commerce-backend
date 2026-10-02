import type { Request } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../services/product-image.service.js";
const body = (req: Request) => req.body;
export const list = asyncHandler(async (req, res) => res.json(successResponse("Product images fetched successfully", await service.list(Number(req.params.productId)))));
export const create = asyncHandler(async (req, res) => res.status(201).json(successResponse("Product image created successfully", await service.create(Number(req.params.productId), req.file, body(req)))));
export const update = asyncHandler(async (req, res) => res.json(successResponse("Product image updated successfully", await service.update(Number(req.params.productId), Number(req.params.imageId), req.file, body(req)))));
export const remove = asyncHandler(async (req, res) => { await service.remove(Number(req.params.productId), Number(req.params.imageId)); res.json(successResponse("Product image deleted successfully", null)); });
