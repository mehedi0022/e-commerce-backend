import type { Request, Response } from "express";
import { marketingService } from "../services/marketing.service.js";

export const getPublicSettings = async (_req: Request, res: Response) => {
  const data = await marketingService.getPublicSettings();
  res.json({
    success: true,
    data,
  });
};

export const getSettings = async (_req: Request, res: Response) => {
  const data = await marketingService.getSettings();
  res.json({
    success: true,
    data,
  });
};

export const updateSettings = async (req: Request, res: Response) => {
  const updated = await marketingService.updateSettings(req.body);
  res.json({
    success: true,
    message: "Marketing and tracking settings saved successfully",
    data: updated,
  });
};

export const testMetaCapi = async (req: Request, res: Response) => {
  const { pixelId, accessToken, testEventCode } = req.body;
  try {
    const metaResponse = await marketingService.testMetaCapiConnection(pixelId, accessToken, testEventCode);
    res.json({
      success: true,
      message: "Test event received by Meta Conversions API successfully!",
      data: metaResponse,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to deliver test event to Meta CAPI",
    });
  }
};
