import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";

const id = z.coerce.number().int().positive();
const variantParams = z.object({ variantId: id });
const positive = z.coerce.number().int().positive();
const nonNegative = z.coerce.number().int().min(0);

export const variantIdSchema = z.object({ params: variantParams });

export const initializeSchema = z.object({
  params: variantParams,
  body: z.object({
    quantity: nonNegative,
    lowStockThreshold: nonNegative.default(5),
    note: z.string().trim().max(500).optional(),
  }).strict(),
});

export const quantitySchema = z.object({
  params: variantParams,
  body: z.object({
    quantity: positive,
    note: z.string().trim().max(500).optional(),
    referenceType: z.string().trim().max(50).optional(),
    referenceId: z.string().trim().max(100).optional(),
  }).strict(),
});

export const adjustmentSchema = z.object({
  params: variantParams,
  body: z.object({
    quantity: z.coerce.number().int().refine((v) => v !== 0, "Adjustment cannot be zero"),
    note: z.string().trim().min(1).max(500),
    referenceType: z.string().trim().max(50).optional(),
    referenceId: z.string().trim().max(100).optional(),
  }).strict(),
});

export const thresholdSchema = z.object({
  params: variantParams,
  body: z.object({
    lowStockThreshold: nonNegative,
  }).strict(),
});

export const movementQuerySchema = z.object({
  params: variantParams,
  query: paginationQuerySchema.extend({
    type: z.enum([
      "INITIAL_STOCK",
      "RESTOCK",
      "ORDER",
      "ORDER_CANCELLED",
      "RETURN",
      "DAMAGED",
      "ADJUSTMENT",
    ] as const).optional(),
    referenceType: z.string().trim().max(50).optional(),
    referenceId: z.string().trim().max(100).optional(),
  }).strict(),
});

export const inventoryListQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    search: z.string().trim().optional(),
    status: z.enum(["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as const).optional(),
  }),
});

export const globalMovementsQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    type: z.enum([
      "INITIAL_STOCK",
      "RESTOCK",
      "ORDER",
      "ORDER_CANCELLED",
      "RETURN",
      "DAMAGED",
      "ADJUSTMENT",
    ] as const).optional(),
    variantId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
  }),
});
