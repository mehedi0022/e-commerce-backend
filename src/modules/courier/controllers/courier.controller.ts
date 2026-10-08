import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../services/courier.service.js";
import * as repo from "../repositories/courier.repository.js";

export const getProviders = asyncHandler(
  async (_req: Request, res: Response) => {
    const providers = await service.getProviders();
    res.json(
      successResponse("Courier providers fetched successfully", providers),
    );
  },
);

export const getProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await service.getProviderById(Number(req.params.id));
  res.json(successResponse("Courier provider fetched successfully", provider));
});

export const updateProvider = asyncHandler(
  async (req: Request, res: Response) => {
    const updated = await service.updateProvider(
      Number(req.params.id),
      req.body,
    );
    res.json(successResponse("Courier provider updated successfully", updated));
  },
);

export const checkBalance = asyncHandler(
  async (req: Request, res: Response) => {
    const balance = await service.checkBalance(String(req.params.code));
    res.json(successResponse("Courier balance fetched successfully", balance));
  },
);

export const getStores = asyncHandler(async (req: Request, res: Response) => {
  const stores = await service.getStores(String(req.params.code));
  res.json(successResponse("Courier stores fetched successfully", stores));
});

export const getCities = asyncHandler(async (req: Request, res: Response) => {
  const cities = await service.getCities(String(req.params.code));
  res.json(successResponse("Courier cities fetched successfully", cities));
});

export const getZones = asyncHandler(async (req: Request, res: Response) => {
  const zones = await service.getZones(
    String(req.params.code),
    Number(req.params.cityId),
  );
  res.json(successResponse("Courier zones fetched successfully", zones));
});

export const bookParcel = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber);
  const result = await service.bookParcel(orderNumber, req.body);
  res.json(successResponse("Courier parcel booked successfully", result));
});

export const bulkBookParcels = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.bulkBookParcels(req.body);
    res.json(successResponse("Bulk courier dispatch completed", result));
  },
);

export const trackParcel = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber);
  const tracking = await service.trackParcel(orderNumber);
  res.json(
    successResponse("Courier tracking status fetched successfully", tracking),
  );
});

export const publicTrackParcel = asyncHandler(
  async (req: Request, res: Response) => {
    const tracking = await service.trackParcelPublic(
      String(req.params.orderNumber),
      String(req.query.phone ?? ""),
    );
    res.json(
      successResponse("Courier tracking status fetched successfully", tracking),
    );
  },
);

export const handleWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const code = String(req.params.code).toLowerCase();

    // Pathao handshake: auth/lookup-এর আগে, ১০ সেকেন্ডের মধ্যে, status 202
    if (code === "pathao" && req.body?.event === "webhook_integration") {
      const provider = await repo.findProviderByCode("pathao");
      const settings = (provider?.settings || {}) as Record<string, any>;
      const integrationSecret = String(
        settings.webhookIntegrationSecret ||
          process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET ||
          "",
      ).trim();

      if (!integrationSecret) {
        res
          .status(500)
          .json({
            success: false,
            message:
              "Pathao webhook integration secret is not configured in database settings or environment",
          });
        return;
      }
      res.set(
        "X-Pathao-Merchant-Webhook-Integration-Secret",
        integrationSecret,
      );
      res.status(202).json({ success: true });
      return;
    }

    const result = await service.handleCourierWebhook(
      code,
      req.body,
      req.headers,
    );
    res.json(successResponse("Courier webhook processed successfully", result));
  },
);

export const syncOrderCourier = asyncHandler(
  async (req: Request, res: Response) => {
    const orderNumber = String(req.params.orderNumber);
    const result = await service.syncOrderCourierStatus(orderNumber);
    res.json(successResponse("Courier status synced successfully", result));
  },
);

export const syncActiveShipments = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await service.syncActiveShipments();
    res.json(
      successResponse("Active courier shipments synced successfully", result),
    );
  },
);
