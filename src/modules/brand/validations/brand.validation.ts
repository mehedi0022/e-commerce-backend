import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";

const params = z.object({ id: z.coerce.number().int().positive() });

const fields = {
  name: z.string().trim().min(1).max(150),
  logo: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
};

export const brandIdSchema = z.object({ params });

export const createBrandSchema = z.object({
  body: z
    .object({
      name: fields.name,
      logo: fields.logo,
      description: fields.description,
    })
    .strict(),
});

export const updateBrandSchema = z.object({
  params,
  body: z
    .object({
      name: fields.name.optional(),
      logo: fields.logo,
      description: fields.description,
    })
    .strict()
    .refine(
      (v) => Object.keys(v).length > 0,
      "At least one brand field is required",
    ),
});

export const brandStatusSchema = z.object({
  params,
  body: z.object({ isActive: z.boolean() }).strict(),
});

export const reorderBrandSchema = z.object({
  params,
  body: z.object({ sortOrder: z.coerce.number().int().min(0) }).strict(),
});

export const brandListQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      search: z.string().trim().min(1).max(100).optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      sortBy: z
        .enum(["id", "name", "sortOrder", "createdAt"])
        .default("sortOrder"),
    })
    .strict(),
});
