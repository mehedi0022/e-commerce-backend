import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import { settingService } from "../services/setting.service.js";

export const getInvoiceSettings = asyncHandler(
  async (_req: Request, res: Response) => {
    const settings = await settingService.getInvoiceSettings();
    res.json(successResponse("Invoice settings fetched successfully", settings));
  }
);

export const updateInvoiceSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const updated = await settingService.updateInvoiceSettings(req.body);
    res.json(successResponse("Invoice settings updated successfully", updated));
  }
);

export const resetInvoiceSettings = asyncHandler(
  async (_req: Request, res: Response) => {
    const reset = await settingService.resetInvoiceSettings();
    res.json(successResponse("Invoice settings reset successfully", reset));
  }
);
