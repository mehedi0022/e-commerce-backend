import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";

const id = z.coerce.number().int().positive();

const params = z.object({ id });

export const categoryIdSchema = z.object({ params });

const parentId = id.optional().nullable();

const fields = {
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).nullable().optional(),
  image: z.string().trim().max(500).nullable().optional(),
  parentId,
};

export const createCategorySchema = z.object({
  body: z
    .object({
      name: fields.name,
      description: fields.description,
      image: fields.image,
      parentId,
    })
    .strict(),
});

export const updateCategorySchema = z.object({
  params,
  body: z
    .object({
      name: fields.name.optional(),
      description: fields.description,
      image: fields.image,
      parentId,
    })
    .strict()
    .refine(
      (v) => Object.keys(v).length > 0,
      "At least one category field is required",
    ),
});

export const categoryStatusSchema = z.object({
  params,
  body: z.object({ isActive: z.boolean() }).strict(),
});

export const reorderCategorySchema = z.object({
  params,
  body: z.object({ sortOrder: z.coerce.number().int().min(0) }).strict(),
});

export const categoryListQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      search: z.string().trim().min(1).max(100).optional(),
      parentId: parentId,
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      sortBy: z
        .enum(["id", "name", "sortOrder", "createdAt"])
        .default("sortOrder"),
    })
    .strict(),
});
