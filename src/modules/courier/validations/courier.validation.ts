import { z } from "zod";

export const updateCourierProviderSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      apiKey: z.string().trim().nullable().optional(),
      apiSecret: z.string().trim().nullable().optional(),
      apiUrl: z.string().trim().nullable().optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      isLive: z.boolean().optional(),
      settings: z.record(z.string(), z.any()).nullable().optional(),
    })
    .strict(),
});

export const bookParcelSchema = z.object({
  params: z.object({
    orderNumber: z.string().trim().min(1),
  }),
  body: z
    .object({
      courierCode: z.string().trim().optional(),
      customNote: z.string().trim().max(300).optional(),
      note: z.string().trim().max(300).optional(),
      itemWeightKg: z.coerce.number().positive().max(50).optional(),
      weight: z.coerce.number().positive().max(50).optional(),
    })
    .optional(),
});

export const trackParcelSchema = z.object({
  params: z.object({
    orderNumber: z.string().trim().min(1),
  }),
});

export const courierCodeSchema = z.object({
  params: z.object({
    code: z.string().trim().min(1),
  }),
});
