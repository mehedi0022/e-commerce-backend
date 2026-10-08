import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import * as analyticsService from "../services/analytics.service.js";
import type { DashboardPeriod } from "../analytics.types.js";

export const getDashboardAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const query = {
      period: (req.query.period as DashboardPeriod) || "30d",
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
    };

    const data = await analyticsService.getDashboardAnalytics(query);

    res.json({
      success: true,
      data,
    });
  },
);
