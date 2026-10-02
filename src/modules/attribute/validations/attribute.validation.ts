import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";
const id = z.coerce.number().int().positive();
const attributeParams = z.object({ id });
const valueParams = z.object({ attributeId: id, valueId: id });
const name = z.string().trim().min(1).max(150);
export const attributeIdSchema = z.object({ params: attributeParams });
export const createAttributeSchema = z.object({
  body: z.object({ name, sortOrder: z.coerce.number().int().min(0).optional() }).strict(),
});
export const updateAttributeSchema = z.object({
  params: attributeParams,
  body: z
    .object({ name: name.optional(), sortOrder: z.coerce.number().int().min(0).optional() })
    .strict()
    .refine((v) => Object.keys(v).length > 0, "At least one field is required"),
});
export const attributeStatusSchema = z.object({
  params: attributeParams,
  body: z.object({ isActive: z.boolean() }).strict(),
});
export const attributeListQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      search: z.string().trim().min(1).max(100).optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    })
    .strict(),
});
export const attributeValueListSchema = z.object({
  params: z.object({ attributeId: id }),
});
export const createValueSchema = z.object({
  params: z.object({ attributeId: id }),
  body: z.object({ value: name, sortOrder: z.coerce.number().int().min(0).optional() }).strict(),
});
export const updateValueSchema = z.object({
  params: valueParams,
  body: z
    .object({ value: name.optional(), isActive: z.boolean().optional(), sortOrder: z.coerce.number().int().min(0).optional() })
    .strict()
    .refine((v) => Object.keys(v).length > 0, "At least one field is required"),
});
export const valueIdSchema = z.object({ params: valueParams });
