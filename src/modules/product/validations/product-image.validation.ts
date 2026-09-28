import { z } from "zod";
const id = z.coerce.number().int().positive();
const ids = z.array(id).max(100).superRefine((v, ctx) => { if (new Set(v).size !== v.length) ctx.addIssue({ code: "custom", message: "Duplicate attributeValueIds are not allowed" }); });
const parseIds = z.preprocess((v) => typeof v === "string" ? JSON.parse(v) : v, ids).optional();
export const productImagesSchema = z.object({ params: z.object({ productId: id }) });
export const imageIdSchema = z.object({ params: z.object({ productId: id, imageId: id }) });
export const imageUploadBodySchema = z.object({ altText: z.string().trim().max(500).nullable().optional(), isPrimary: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional(), sortOrder: z.coerce.number().int().min(0).optional(), attributeValueIds: parseIds }).strict();
export const imageUpdateSchema = z.object({ params: z.object({ productId: id, imageId: id }), body: imageUploadBodySchema.shape }).strict();
