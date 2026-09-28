import { z } from "zod";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryListQuerySchema,
  categoryIdSchema,
  categoryStatusSchema,
  reorderCategorySchema,
} from "./validations/category.validation.js";

export type CreateCategoryInput = z.infer<typeof createCategorySchema>["body"];

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>["body"];

export type CategoryListQuery = z.infer<
  typeof categoryListQuerySchema
>["query"];

export type CategoryStatusInput = z.infer<typeof categoryStatusSchema>["body"];

export type ReorderCategoryInput = z.infer<
  typeof reorderCategorySchema
>["body"];

export type CategoryIdParams = z.infer<typeof categoryIdSchema>["params"];
