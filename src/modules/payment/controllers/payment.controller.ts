import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../services/payment.service.js";

export const getPublic = asyncHandler(async (_req: Request, res: Response) => {
  const methods = await service.getPublicMethods();
  res.json(successResponse("Payment methods fetched successfully", methods));
});

export const getAdminList = asyncHandler(async (_req: Request, res: Response) => {
  const methods = await service.getAdminMethods();
  res.json(successResponse("Payment methods fetched successfully", methods));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const method = await service.getMethodById(Number(req.params.id));
  res.json(successResponse("Payment method fetched successfully", method));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const created = await service.createMethod(req.body);
  res
    .status(201)
    .json(successResponse("Payment method created successfully", created));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const updated = await service.updateMethod(Number(req.params.id), req.body);
  res.json(successResponse("Payment method updated successfully", updated));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteMethod(Number(req.params.id));
  res.json(successResponse("Payment method deleted successfully", null));
});

export const getOrderTransactions = asyncHandler(async (req: Request, res: Response) => {
  const transactions = await service.getOrderTransactions(Number(req.params.orderId));
  res.json(successResponse("Order payment transactions fetched successfully", transactions));
});

export const verifyTransaction = asyncHandler(async (req: Request, res: Response) => {
  const adminUserId = req.auth!.userId;
  const verified = await service.verifyTransaction(
    Number(req.params.id),
    req.body,
    adminUserId,
  );
  res.json(successResponse("Payment verification status updated successfully", verified));
});

export const initiateGateway = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.initiateGatewayPayment(Number(req.params.orderId));
  res.json(successResponse("Payment gateway initiated successfully", result));
});

export const handleGatewayCallback = asyncHandler(async (req: Request, res: Response) => {
  const code = String(req.params.code);
  const result = await service.handleGatewayCallback(code, req.query, req.body);
  res.redirect(result.redirectUrl);
});
