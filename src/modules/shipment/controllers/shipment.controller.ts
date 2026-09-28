import { asyncHandler } from "../../../utils/asyncHandler.js";
import { paginatedResponse, successResponse } from "../../../utils/api-response.js";
import * as service from "../services/shipment.service.js";
export const create = asyncHandler(async (req, res) => res.status(201).json(successResponse("Shipment created successfully", await service.create(String(req.params.orderNumber), req.auth!.userId, req.body))));
export const get = asyncHandler(async (req, res) => res.json(successResponse("Shipment fetched successfully", await service.get(String(req.params.orderNumber)))));
export const update = asyncHandler(async (req, res) => res.json(successResponse("Shipment updated successfully", await service.update(String(req.params.orderNumber), req.body))));
export const transition = asyncHandler(async (req, res) => res.json(successResponse("Shipment status updated successfully", await service.transition(String(req.params.orderNumber), req.body.status, req.auth!.userId, req.body.note))));
export const list = asyncHandler(async (req, res) => { const q: any = req.query; const rows: any[] = await service.list(q); res.json(paginatedResponse("Shipments fetched successfully", rows, { page: q.page, limit: q.limit, total: rows.length, totalPages: rows.length === q.limit ? q.page + 1 : q.page })); });
