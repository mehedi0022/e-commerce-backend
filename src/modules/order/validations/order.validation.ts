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
      source: z
        .enum([
          "WEBSITE",
          "LANDING_PAGE",
          "PHONE_CALL",
          "WHATSAPP",
          "MESSENGER",
          "OUTLET_POS",
          "MANUAL_OTHER",
        ])
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

const manualOrderItemSchema = z.object({
  productId: z.number().int().positive().optional(),
  variantId: z.number().int().positive(),
  sku: z.string().trim().optional(),
  productName: z.string().trim().optional(),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.union([z.number().nonnegative(), z.string()]),
});

export const manualOrderSchema = z.object({
  body: z.object({
    source: z.enum([
      "WEBSITE",
      "LANDING_PAGE",
      "PHONE_CALL",
      "WHATSAPP",
      "MESSENGER",
      "OUTLET_POS",
      "MANUAL_OTHER",
    ]).default("OUTLET_POS"),
    fulfillmentType: z.enum(["DELIVERY", "STORE_PICKUP"]).default("DELIVERY"),
    customerId: z.number().int().positive().nullable().optional(),
    customerName: z.string().trim().min(1, "Customer name is required").max(255),
    customerPhone: z.string().trim().min(6, "Valid phone number is required").max(50),
    customerEmail: z.string().trim().email().max(255).nullable().optional(),
    shippingAddress: z.object({
      fullName: z.string().trim().max(255).optional(),
      phone: z.string().trim().max(50).optional(),
      divisionId: z.string().trim().optional(),
      districtId: z.string().trim().optional(),
      upazilaId: z.string().trim().optional(),
      unionId: z.string().trim().optional(),
      division: z.string().trim().max(100).optional(),
      district: z.string().trim().max(100).optional(),
      upazila: z.string().trim().max(100).optional(),
      thana: z.string().trim().max(100).optional(),
      area: z.string().trim().max(100).optional(),
      addressLine1: z.string().trim().max(500).optional(),
      addressLine2: z.string().trim().max(500).optional(),
      postalCode: z.string().trim().max(20).optional(),
      countryCode: z.string().trim().max(10).default("BD"),
    }).nullable().optional(),
    items: z.array(manualOrderItemSchema).min(1, "At least one item is required in the order"),
    shippingMethodId: z.number().int().positive().nullable().optional(),
    shippingFee: z.union([z.number().nonnegative(), z.string()]).default(0),
    discountAmount: z.union([z.number().nonnegative(), z.string()]).default(0),
    advanceAmount: z.union([z.number().nonnegative(), z.string()]).default(0),
    paymentMethod: z.enum(["CASH_ON_DELIVERY", "ONLINE", "PARTIAL_COD"]).default("CASH_ON_DELIVERY"),
    paymentMethodCode: z.string().trim().optional(),
    paymentStatus: z.enum(["UNPAID", "PAID", "PARTIALLY_PAID"]).optional(),
    orderStatus: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "DELIVERED"]).optional(),
    customerNote: z.string().trim().max(1000).optional(),
    adminNote: z.string().trim().max(1000).optional(),
  }),
});

