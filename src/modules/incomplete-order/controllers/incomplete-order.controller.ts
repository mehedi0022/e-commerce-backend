import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse, paginatedResponse } from "../../../utils/api-response.js";
import * as service from "../services/incomplete-order.service.js";

export const capture = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.capture(req.body);
  res.status(200).json(successResponse("Incomplete order captured successfully", result));
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as any);
  res.json(paginatedResponse("Incomplete orders fetched successfully", result.data, result.meta));
});

export const getMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await service.getMetrics();
  res.json(successResponse("Incomplete order metrics fetched successfully", metrics));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getById(Number(req.params.id));
  res.json(successResponse("Incomplete order fetched successfully", result));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.update(Number(req.params.id), req.body);
  res.json(successResponse("Incomplete order updated successfully", result));
});

export const convert = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.convertToOrder(Number(req.params.id), req.auth!.userId, req.body);
  res.status(201).json(successResponse("Incomplete order converted to confirmed order successfully", result));
});
