import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";
import { sanitizeDescription } from "../description-html.js";

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
  description: z
    .string()
    .trim()
    .max(10000)
    .transform(sanitizeDescription)
    .nullable()
    .optional(),
  brandId: id.nullable().optional(),
  status: z
    .enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] as const)
    .optional(),
  isFeatured: z.boolean().optional(),
  categories: categories.optional(),
};

export const productIdSchema = z.object({ params: z.object({ id }) });
export const publicProductSlugSchema = z.object({
  params: z.object({ slug: z.string().trim().min(1).max(250) }),
});

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
      brandIds: z.string().trim().optional(),
      categoryId: id.optional(),
      categorySlug: z.string().trim().optional(),
      isFeatured: z.coerce.boolean().optional(),
      minPrice: z.coerce.number().min(0).optional(),
      maxPrice: z.coerce.number().min(0).optional(),
      rating: z.coerce.number().min(1).max(5).optional(),
      inStock: z.coerce.boolean().optional(),
      publicCards: z.coerce.boolean().optional(),
      sortBy: z
        .enum([
          "id",
          "name",
          "createdAt",
          "price",
          "rating",
          "isFeatured",
        ] as const)
        .default("createdAt"),
      sortOrder: z.enum(["asc", "desc"] as const).default("desc"),
    })
    .strict(),
});
