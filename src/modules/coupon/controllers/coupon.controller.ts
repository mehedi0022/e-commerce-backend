import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { paginatedResponse, successResponse } from "../../../utils/api-response.js";
import { moneyMultiply, moneySum } from "../../../utils/money.util.js";
import * as cart from "../../cart/services/cart.service.js";
import * as cartRepo from "../../cart/repositories/cart.repository.js";
import * as service from "../services/coupon.service.js";
import { ValidationError } from "../../../errors/AppError.js";
export const create = asyncHandler(async (req, res) => res.status(201).json(successResponse("Coupon created successfully", await service.create(req.body))));
export const list = asyncHandler(async (req, res) => {
  const q: any = req.query;
  const result: any = await service.list(q);
  const rows = result.rows ?? result;
  const total = Number(result.total ?? rows.length);
  const limit = Number(q.limit || 20);
  const page = Number(q.page || 1);
  const totalPages = Math.ceil(total / limit) || 1;
  res.json(paginatedResponse("Coupons fetched successfully", rows, {
    page,
    limit,
    total,
    totalPages,
  }));
});
export const detail = asyncHandler(async (req, res) => res.json(successResponse("Coupon fetched successfully", await service.get(Number(req.params.id)))));
export const update = asyncHandler(async (req, res) => res.json(successResponse("Coupon updated successfully", await service.update(Number(req.params.id), req.body))));
export const remove = asyncHandler(async (req, res) => { await service.remove(Number(req.params.id)); res.json(successResponse("Coupon deleted successfully", null)); });
export const preview = asyncHandler(async (req: Request, res: Response) => { const context: any = await cart.resolve(req); const current: any = context.cart; if (!current?.items?.length) throw new ValidationError("Cart is empty"); const subtotal = moneySum(current.items.map((x: any) => moneyMultiply(x.variant.price, x.quantity))); const result: any = await service.validateAndCalculate(req.body.code, subtotal, req.auth?.userId); res.json(successResponse("Coupon applied successfully", { code: result.normalizedCode, discountType: result.coupon.discountType, discountValue: String(result.coupon.discountValue), subtotal, discountAmount: result.discountAmount, message: "Coupon applied successfully" })); });
