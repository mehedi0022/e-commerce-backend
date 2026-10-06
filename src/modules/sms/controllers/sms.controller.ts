import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../services/sms.service.js";

// Providers
export const listProviders = asyncHandler(async (_req: Request, res: Response) => {
  const providers = await service.getAllProviders();
  res.json(successResponse("SMS providers fetched successfully", providers));
});

export const getProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await service.getProviderById(Number(req.params.id));
  res.json(successResponse("SMS provider fetched successfully", provider));
});

export const createProvider = asyncHandler(async (req: Request, res: Response) => {
  const created = await service.createProvider(req.body);
  res.status(201).json(successResponse("SMS provider created successfully", created));
});

export const updateProvider = asyncHandler(async (req: Request, res: Response) => {
  const updated = await service.updateProvider(Number(req.params.id), req.body);
  res.json(successResponse("SMS provider updated successfully", updated));
});

export const deleteProvider = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteProvider(Number(req.params.id));
  res.json(successResponse("SMS provider deleted successfully", null));
});

export const checkBalance = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.checkProviderBalance(Number(req.params.id));
  res.json(successResponse("Balance checked successfully", result));
});

// Templates
export const listTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await service.getAllTemplates();
  res.json(successResponse("Notification templates fetched successfully", templates));
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const event = String(req.params.event);
  const updated = await service.updateTemplate(event, req.body);
  res.json(successResponse("Notification template updated successfully", updated));
});

// Test SMS
export const sendTestSms = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.sendTestSms(req.body.phone);
  res.json(successResponse("Test SMS process finished", result));
});

// Logs
export const listLogs = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const logs = await service.getSmsLogs(limit);
  res.json(successResponse("SMS logs fetched successfully", logs));
});
