import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { paginatedResponse, successResponse } from "../../../utils/api-response.js";
import { NotFoundError } from "../../../errors/AppError.js";
import { ConflictError } from "../../../errors/AppError.js";
import * as shipmentRepo from "../../shipment/repositories/shipment.repository.js";
import * as service from "../services/order.service.js";
import type { OrderListQuery, OrderTransitionInput } from "../order.types.js";
export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as OrderListQuery;
  const result: any = await service.customerList(req.auth!.userId, q);
  const rows = result.rows ?? result;
  const total = Number(result.total ?? rows.length);
  const limit = Number(q.limit || 20);
  const page = Number(q.page || 1);
  const totalPages = Math.ceil(total / limit) || 1;
  res.json(paginatedResponse("Orders fetched successfully", rows as any[], {
    page,
    limit,
    total,
    totalPages,
  }));
});
export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as OrderListQuery;
  const result: any = await service.adminList(q);
  const rows = result.rows ?? result;
  const total = Number(result.total ?? rows.length);
  const limit = Number(q.limit || 20);
  const page = Number(q.page || 1);
  const totalPages = Math.ceil(total / limit) || 1;
  res.json(paginatedResponse("Orders fetched successfully", rows as any[], {
    page,
    limit,
    total,
    totalPages,
  }));
});
export const detail = asyncHandler(async (req: Request, res: Response) => res.json(successResponse("Order fetched successfully", await service.detail(String(req.params.orderNumber), req.auth!.userId))));
export const guestDetail = asyncHandler(async (req: Request, res: Response) => res.json(successResponse("Order fetched successfully", await service.detail(String(req.params.orderNumber), undefined, String(req.query.accessToken ?? "")))));
export const track = asyncHandler(async (req: Request, res: Response) => res.json(successResponse("Order tracking details fetched successfully", await service.trackOrder(String(req.query.orderNumber), String(req.query.phone)))));
export const adminDetail = asyncHandler(async (req: Request, res: Response) => { const x: any = await (await import("../repositories/order.repository.js")).findByNumber(String(req.params.orderNumber)); if (!x) throw new NotFoundError("Order not found"); res.json(successResponse("Order fetched successfully", x)); });
export const transition = asyncHandler(async (req: Request, res: Response) => { const body = req.body as OrderTransitionInput; res.json(successResponse("Order status updated successfully", await service.transition(String(req.params.orderNumber), body.status, req.auth!.userId, body.note))); });
export const updateAdmin = asyncHandler(async (req: Request, res: Response) => { res.json(successResponse("Order updated successfully", await service.updateAdmin(String(req.params.orderNumber), req.body))); });
export const adminStatusCounts = asyncHandler(async (_req: Request, res: Response) => {
  const counts = await service.adminStatusCounts();
  res.json(successResponse("Order status counts fetched successfully", counts));
});

