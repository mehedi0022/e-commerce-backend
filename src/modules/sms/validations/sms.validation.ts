import { z } from "zod";

const id = z.coerce.number().int().positive();

export const providerIdSchema = z.object({
  params: z.object({ id }),
});

export const templateEventSchema = z.object({
  params: z.object({ event: z.string().trim().min(2) }),
});

export const createProviderSchema = z.object({
  body: z.object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9_-]+$/, "Code must be lowercase alphanumeric with underscores/hyphens"),
    name: z.string().trim().min(2).max(100),
    senderId: z.string().trim().max(50).optional().nullable(),
    apiKey: z.string().trim().max(255).optional().nullable(),
    apiSecret: z.string().trim().max(255).optional().nullable(),
    apiUrl: z.string().trim().url().optional().nullable(),
    isActive: z.boolean().default(false),
  }),
});

export const updateProviderSchema = z.object({
  params: z.object({ id }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      senderId: z.string().trim().max(50).optional().nullable(),
      apiKey: z.string().trim().max(255).optional().nullable(),
      apiSecret: z.string().trim().max(255).optional().nullable(),
      apiUrl: z.string().trim().url().optional().nullable(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export const updateTemplateSchema = z.object({
  params: z.object({ event: z.string().trim().min(2) }),
  body: z
    .object({
      smsEnabled: z.boolean().optional(),
      smsTemplate: z.string().trim().min(1).max(1000).optional(),
      emailEnabled: z.boolean().optional(),
      emailSubject: z.string().trim().min(1).max(255).optional(),
      emailTemplate: z.string().trim().optional().nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export const testSmsSchema = z.object({
  body: z.object({
    phone: z.string().trim().min(11).max(15),
  }),
});
