import { z } from "zod";
const id = z.coerce.number().int().positive();
const params = z.object({ id });
const date = z.coerce.date().nullable().optional();
const fields = {
  title: z.string().trim().min(1).max(200), subtitle: z.string().trim().max(500).nullable().optional(), imageUrl: z.string().trim().max(1000).nullable().optional(), mobileImage: z.string().trim().max(1000).nullable().optional(), buttonText: z.string().trim().max(100).nullable().optional(), buttonUrl: z.string().trim().max(1000).nullable().optional(), startsAt: date, endsAt: date,
};
export const sliderIdSchema = z.object({ params });
export const createSliderSchema = z.object({ body: z.object({ ...fields, isActive: z.boolean().optional(), sortOrder: z.coerce.number().int().min(0).optional() }).strict().superRefine((v, ctx) => { if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "endsAt must be after startsAt" }); }) });
export const updateSliderSchema = z.object({ params, body: z.object({ ...fields, title: fields.title.optional(), imageUrl: fields.imageUrl.optional(), isActive: z.boolean().optional(), sortOrder: z.coerce.number().int().min(0).optional() }).strict().refine((v) => Object.keys(v).length > 0, "At least one slider field is required") });
export const sliderStatusSchema = z.object({ params, body: z.object({ isActive: z.boolean() }).strict() });
export const sliderReorderSchema = z.object({ params, body: z.object({ sortOrder: z.coerce.number().int().min(0) }).strict() });
export const sliderListQuerySchema = z.object({ query: z.object({ activeOnly: z.enum(["true", "false"]).optional() }).strict() });
