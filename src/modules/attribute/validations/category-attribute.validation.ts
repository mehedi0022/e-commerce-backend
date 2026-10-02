import { z } from "zod";

const categoryId = z.coerce.number().int().positive();
const assignment = z.object({
  attributeId: z.coerce.number().int().positive(),
  isRequired: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const categoryAttributesSchema = z.object({
  params: z.object({ categoryId }),
});

export const updateCategoryAttributesSchema = z.object({
  params: z.object({ categoryId }),
  body: z.object({ attributes: z.array(assignment).max(100).refine(items => new Set(items.map(item => item.attributeId)).size === items.length, "An attribute cannot be assigned more than once") }).strict(),
});

export type CategoryAttributeAssignment = z.infer<typeof assignment>;
