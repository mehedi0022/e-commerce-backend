import { z } from "zod";

const id = z.coerce.number().int().positive();

export const paymentMethodIdSchema = z.object({
  params: z.object({ id }),
});

export const orderPaymentParamsSchema = z.object({
  params: z.object({ orderId: id }),
});

export const transactionIdSchema = z.object({
  params: z.object({ id }),
});

export const createPaymentMethodSchema = z.object({
  body: z.object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9_-]+$/, "Code must be lowercase alphanumeric with underscores/hyphens"),
    name: z.string().trim().min(2).max(100),
    type: z.enum(["COD", "MANUAL_MFS", "MANUAL_BANK", "AUTOMATED_GATEWAY"]),
    accountType: z.enum(["PERSONAL", "AGENT", "MERCHANT"]).default("PERSONAL"),
    accountNumber: z.string().trim().max(100).optional().nullable(),
    bankName: z.string().trim().max(100).optional().nullable(),
    branchName: z.string().trim().max(100).optional().nullable(),
    routingNumber: z.string().trim().max(50).optional().nullable(),
    instructions: z.string().trim().max(5000).optional().nullable(),
    qrCodeUrl: z.string().trim().url().optional().nullable(),
    chargePercentage: z.coerce.number().min(0).max(100).default(0),
    chargeFlat: z.coerce.number().min(0).default(0),
    isActive: z.boolean().default(true),
    isLive: z.boolean().default(false),
    credentials: z.record(z.string(), z.any()).optional().nullable(),
    sortOrder: z.coerce.number().int().default(0),
  }),
});

export const updatePaymentMethodSchema = z.object({
  params: z.object({ id }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      type: z.enum(["COD", "MANUAL_MFS", "MANUAL_BANK", "AUTOMATED_GATEWAY"]).optional(),
      accountType: z.enum(["PERSONAL", "AGENT", "MERCHANT"]).optional(),
      accountNumber: z.string().trim().max(100).optional().nullable(),
      bankName: z.string().trim().max(100).optional().nullable(),
      branchName: z.string().trim().max(100).optional().nullable(),
      routingNumber: z.string().trim().max(50).optional().nullable(),
      instructions: z.string().trim().max(5000).optional().nullable(),
      qrCodeUrl: z.string().trim().url().optional().nullable(),
      chargePercentage: z.coerce.number().min(0).max(100).optional(),
      chargeFlat: z.coerce.number().min(0).optional(),
      isActive: z.boolean().optional(),
      isLive: z.boolean().optional(),
      credentials: z.record(z.string(), z.any()).optional().nullable(),
      sortOrder: z.coerce.number().int().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export const verifyPaymentSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    status: z.enum(["VERIFIED", "REJECTED"]),
    adminNote: z.string().trim().max(1000).optional(),
  }),
});
