import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { CustomerService } from "../services/customer.service.js";

export const getCustomers = asyncHandler(async (req: Request, res: Response) => {
  const query = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
    status: req.query.status as any,
    sortBy: req.query.sortBy as any,
    sortOrder: req.query.sortOrder as any,
  };

  const result = await CustomerService.list(query);
  res.json({
    success: true,
    data: result,
  });
});

export const getCustomerById = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await CustomerService.getDetail(id);
  res.json({
    success: true,
    data: result,
  });
});

export const changeCustomerStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { isActive } = req.body;
  const result = await CustomerService.setStatus(id, Boolean(isActive));
  res.json({
    success: true,
    message: `Customer account ${isActive ? "activated" : "deactivated"} successfully`,
    data: result,
  });
});
