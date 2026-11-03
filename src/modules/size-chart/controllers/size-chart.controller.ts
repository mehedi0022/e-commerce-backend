import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../services/size-chart.service.js";

export const list = asyncHandler(async (_req, res) => {
  const data = await service.list();
  res.json(successResponse("Size charts fetched successfully", data));
});

export const get = asyncHandler(async (req, res) => {
  const data = await service.get(Number(req.params.id));
  res.json(successResponse("Size chart fetched successfully", data));
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  res.status(201).json(successResponse("Size chart created successfully", data));
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.update(Number(req.params.id), req.body);
  res.json(successResponse("Size chart updated successfully", data));
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(Number(req.params.id));
  res.json(successResponse("Size chart deleted successfully", null));
});
