import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as service from "../../order/services/order.service.js";
import { guestCartCookieName } from "../../../utils/cookie.util.js";
export const authenticated = asyncHandler(async (req: Request, res: Response) =>
  res
    .status(201)
    .json(
      successResponse(
        "Checkout completed successfully",
        await service.checkout(req.body, req.auth!.userId),
      ),
    ),
);
export const guest = asyncHandler(async (req: Request, res: Response) => {
  const result: any = await service.checkout(
    req.body,
    undefined,
    req.cookies?.[guestCartCookieName],
  );
  res.clearCookie(guestCartCookieName);
  res
    .status(201)
    .json(successResponse("Guest checkout completed successfully", result));
});
