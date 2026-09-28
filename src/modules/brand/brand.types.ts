import { z } from "zod";
import {
  createBrandSchema,
  updateBrandSchema,
  brandListQuerySchema,
  brandIdSchema,
  brandStatusSchema,
  reorderBrandSchema,
} from "./validations/brand.validation.js";

export type CreateBrandInput = z.infer<typeof createBrandSchema>["body"];
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>["body"];
export type BrandListQuery = z.infer<typeof brandListQuerySchema>["query"];
export type ReorderBrandInput = z.infer<typeof reorderBrandSchema>["body"];
export type BrandIdParams = z.infer<typeof brandIdSchema>["params"];
export type BrandStatusInput = z.infer<typeof brandStatusSchema>["body"];
