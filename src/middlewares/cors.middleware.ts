import type { Request, Response, NextFunction } from "express";
import cors from "cors";

import { config } from "../config/env.js";
import { AuthorizationError } from "../errors/AppError.js";

const allowedOrigins = new Set(config.cors.origins);

const standardCors = cors({
  credentials: config.cors.credentials,
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.has(origin) ||
      origin.includes("sslcommerz.com") ||
      origin.includes("bkash.com") ||
      origin.includes("nagad.com.bd")
    ) {
      return callback(null, true);
    }
    return callback(new AuthorizationError("Origin is not allowed"));
  },
  optionsSuccessStatus: 204,
});

const gatewayCors = cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 204,
});

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const url = req.originalUrl || req.url || req.path || "";
  if (url.includes("/payments/gateway/")) {
    return gatewayCors(req, res, next);
  }
  return standardCors(req, res, next);
};
