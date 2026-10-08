import { z } from "zod";

import { guestOrderAccessSchema } from "../../checkout/validations/checkout.validation.js";

const orderNumberParams = z.object({
  orderNumber: z.string().trim().min(1).max(80),
});

export const orderNumberSchema = z.object({
  params: orderNumberParams,
});

export const guestOrderSchema = z.object({
  params: orderNumberParams,
  query: guestOrderAccessSchema,
});

export const trackOrderSchema = z.object({
  query: z.object({
    orderNumber: z.string().trim().min(3).max(80),
    phone: z.string().trim().min(10).max(30),
  }),
});

export const orderListSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      status: z
        .enum([
          "ALL",
          "PENDING",
          "CONFIRMED",
          "PROCESSING",
          "READY_TO_SHIP",
          "SHIPPED",
          "DELIVERED",
          "CANCELLED",
          "RETURNED",
        ])
        .optional(),
      paymentStatus: z
        .enum(["UNPAID", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"])
        .optional(),
      search: z.string().trim().max(100).optional(),
      orderNumber: z.string().trim().min(1).max(80).optional(),
      customerPhone: z.string().trim().min(1).max(30).optional(),
      customerEmail: z.string().trim().email().optional(),
    })
    .strict(),
});

export const orderTransitionSchema = z.object({
  params: orderNumberParams,
  body: z
    .object({
      status: z.enum([
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ]),
      note: z.string().max(500).optional(),
    })
    .strict(),
});

export const updateAdminOrderSchema = z.object({
  params: orderNumberParams,
  body: z
    .object({
      paymentStatus: z
        .enum(["UNPAID", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"])
        .optional(),
      adminNote: z.string().max(1000).nullable().optional(),
    })
    .strict()
    .refine((d) => Object.keys(d).length > 0, "At least one field is required"),
});

