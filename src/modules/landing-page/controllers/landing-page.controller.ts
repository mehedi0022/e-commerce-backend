import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse, paginatedResponse } from "../../../utils/api-response.js";
import { ValidationError } from "../../../errors/AppError.js";
import { uploadService } from "../../upload/upload.module.js";
import * as service from "../services/landing-page.service.js";

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ValidationError("Image file is required");
  const stored = await uploadService.upload(req.file, "landing-pages");
  res.json(successResponse("Image uploaded successfully", { url: stored.url, key: stored.key }));
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.list(req.query as any);
  res.json(paginatedResponse("Landing pages fetched successfully", result.data, result.meta));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getById(Number(req.params.id));
  res.json(successResponse("Landing page fetched successfully", result));
});

export const getPublicBySlug = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getPublicBySlug(String(req.params.slug));
  res.json(successResponse("Landing page fetched successfully", result));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.create(req.body);
  res.status(201).json(successResponse("Landing page created successfully", result));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.update(Number(req.params.id), req.body);
  res.json(successResponse("Landing page updated successfully", result));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(Number(req.params.id));
  res.json(successResponse("Landing page deleted successfully", null));
});
