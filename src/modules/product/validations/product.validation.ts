import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";

const id = z.coerce.number().int().positive();

export const categoryAssignment = z.object({
  categoryId: id,
  isPrimary: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const categories = z
  .array(categoryAssignment)
  .max(100)
  .superRefine((items, ctx) => {
    const ids = new Set<number>();
    for (const [index, item] of items.entries()) {
      if (ids.has(item.categoryId))
        ctx.addIssue({
          code: "custom",
          path: [index, "categoryId"],
          message: "Duplicate categoryId",
        });
      ids.add(item.categoryId);
    }
    const primary = items.filter((x) => x.isPrimary).length;
    if (items.length > 0 && primary !== 1)
      ctx.addIssue({
        code: "custom",
        message: "Exactly one primary category is required",
      });
  });

const fields = {
  name: z.string().trim().min(1).max(250),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  brandId: id.nullable().optional(),
  status: z
    .enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] as const)
    .optional(),
  isFeatured: z.boolean().optional(),
  categories: categories.optional(),
};

export const productIdSchema = z.object({ params: z.object({ id }) });

export const createProductSchema = z.object({
  body: z.object(fields).strict(),
});

export const updateProductSchema = z.object({
  params: z.object({ id }),
  body: z
    .object({ ...fields, name: fields.name.optional() })
    .strict()
    .refine(
      (x) => Object.keys(x).length > 0,
      "At least one product field is required",
    ),
});

export const productStatusSchema = z.object({
  params: z.object({ id }),
  body: z.object({ status: fields.status.unwrap() }).strict(),
});

export const productListQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      search: z.string().trim().min(1).max(100).optional(),
      status: z
        .enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] as const)
        .optional(),
      brandId: id.optional(),
      categoryId: id.optional(),
      isFeatured: z.coerce.boolean().optional(),
      sortBy: z.enum(["id", "name", "createdAt"] as const).default("createdAt"),
    })
    .strict(),
});
