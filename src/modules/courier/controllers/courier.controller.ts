import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../services/courier.service.js";

export const getProviders = asyncHandler(async (_req: Request, res: Response) => {
  const providers = await service.getProviders();
  res.json(successResponse("Courier providers fetched successfully", providers));
});

export const getProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await service.getProviderById(Number(req.params.id));
  res.json(successResponse("Courier provider fetched successfully", provider));
});

export const updateProvider = asyncHandler(async (req: Request, res: Response) => {
  const updated = await service.updateProvider(Number(req.params.id), req.body);
  res.json(successResponse("Courier provider updated successfully", updated));
});

export const checkBalance = asyncHandler(async (req: Request, res: Response) => {
  const balance = await service.checkBalance(String(req.params.code));
  res.json(successResponse("Courier balance fetched successfully", balance));
});

export const getStores = asyncHandler(async (req: Request, res: Response) => {
  const stores = await service.getStores(String(req.params.code));
  res.json(successResponse("Courier stores fetched successfully", stores));
});

export const bookParcel = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber);
  const result = await service.bookParcel(orderNumber, req.body);
  res.json(successResponse("Courier parcel booked successfully", result));
});

export const trackParcel = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber);
  const tracking = await service.trackParcel(orderNumber);
  res.json(successResponse("Courier tracking status fetched successfully", tracking));
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const courierCode = String(req.params.code);
  const result = await service.handleCourierWebhook(courierCode, req.body, req.headers);
  res.json(successResponse("Courier webhook processed successfully", result));
});

export const syncOrderCourier = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber);
  const result = await service.syncOrderCourierStatus(orderNumber);
  res.json(successResponse("Courier status synced successfully", result));
});

export const syncActiveShipments = asyncHandler(async (_req: Request, res: Response) => {
  const result = await service.syncActiveShipments();
  res.json(successResponse("Active courier shipments synced successfully", result));
});
