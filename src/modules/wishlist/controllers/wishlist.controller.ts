import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../services/wishlist.service.js";
export const add = asyncHandler(async (req, res) => res.status(201).json(successResponse("Product added to wishlist successfully", await service.add(req.auth!.userId, Number(req.params.productId)))));
export const list = asyncHandler(async (req, res) => { const q: any = req.query; const result = await service.list(req.auth!.userId, q.page, q.limit); res.json({ ...successResponse("Wishlist fetched successfully", result.items), meta: result.meta, wishlistCount: result.count }); });
export const remove = asyncHandler(async (req, res) => { await service.remove(req.auth!.userId, Number(req.params.productId)); res.json(successResponse("Product removed from wishlist successfully", null)); });
