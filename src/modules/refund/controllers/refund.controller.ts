import { asyncHandler } from "../../../utils/asyncHandler.js";
import { paginatedResponse, successResponse } from "../../../utils/api-response.js";
import * as service from "../services/refund.service.js";
export const create = asyncHandler(async (req, res) => res.status(201).json(successResponse("Refund created successfully", await service.create(String(req.params.returnNumber), req.body, req.auth!.userId))));
export const list = asyncHandler(async (req, res) => { const q: any = req.query; const rows: any[] = await service.list(q); res.json(paginatedResponse("Refunds fetched successfully", rows, { page: q.page, limit: q.limit, total: rows.length, totalPages: rows.length === q.limit ? q.page + 1 : q.page })); });
export const detail = asyncHandler(async (req, res) => res.json(successResponse("Refund fetched successfully", await service.get(String(req.params.refundNumber)))));
export const transition = asyncHandler(async (req, res) => res.json(successResponse("Refund status updated successfully", await service.transition(String(req.params.refundNumber), req.body.status, req.auth!.userId, req.body.note))));
