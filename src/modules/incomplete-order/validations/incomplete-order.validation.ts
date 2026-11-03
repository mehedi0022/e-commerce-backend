import { z } from "zod";

const cartItemSchema = z.object({
  variantId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
  name: z.string().trim().min(1),
  sku: z.string().trim().optional(),
  price: z.union([z.number(), z.string()]),
  quantity: z.number().int().positive().default(1),
  image: z.string().trim().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
});

export const captureIncompleteOrderSchema = z.object({
  body: z.object({
    sessionId: z.string().trim().min(1, "Session ID is required").max(120),
    customerName: z.string().trim().max(255).nullable().optional(),
    customerPhone: z.string().trim().min(6, "Valid phone number required").max(50),
    customerEmail: z.string().trim().email().max(255).nullable().optional(),
    shippingAddress: z.object({
      fullName: z.string().trim().max(255).optional(),
      phone: z.string().trim().max(50).optional(),
      division: z.string().trim().max(100).optional(),
      district: z.string().trim().max(100).optional(),
      upazila: z.string().trim().max(100).optional(),
      thana: z.string().trim().max(100).optional(),
      area: z.string().trim().max(100).optional(),
      addressLine1: z.string().trim().max(500).optional(),
      addressLine2: z.string().trim().max(500).optional(),
    }).nullable().optional(),
    cartItems: z.array(cartItemSchema).min(1, "At least one item is required in cart"),
    subtotal: z.union([z.number(), z.string()]).optional(),
    shippingFee: z.union([z.number(), z.string()]).optional(),
    totalAmount: z.union([z.number(), z.string()]).optional(),
    source: z.string().trim().max(100).default("CHECKOUT"),
  }),
});

export const updateIncompleteOrderSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    status: z.enum(["PENDING", "CALLED_NO_RESPONSE", "CONTACTED", "CONVERTED", "CANCELLED"]).optional(),
    crmNotes: z.string().trim().max(2000).nullable().optional(),
  }),
});

export const incompleteOrderQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.string().trim().optional(),
    search: z.string().trim().optional(),
    source: z.string().trim().optional(),
  }),
});

export const incompleteOrderIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export const convertIncompleteOrderSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    customerName: z.string().trim().min(1, "Customer name is required").max(255).optional(),
    customerPhone: z.string().trim().min(6, "Valid phone number is required").max(50).optional(),
    customerEmail: z.string().trim().email().max(255).nullable().optional(),
    shippingAddress: z.object({
      fullName: z.string().trim().max(255).optional(),
      phone: z.string().trim().max(50).optional(),
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
    cartItems: z.array(cartItemSchema).min(1, "At least one item is required").optional(),
    paymentMethod: z.enum(["CASH_ON_DELIVERY", "ONLINE"]).optional(),
    shippingFee: z.union([z.number().nonnegative(), z.string()]).optional(),
    advanceAmount: z.union([z.number().nonnegative(), z.string()]).optional(),
    discountAmount: z.union([z.number().nonnegative(), z.string()]).optional(),
    adminNote: z.string().trim().max(2000).optional(),
  }).optional(),
});
