import { z } from "zod";
import * as v from "./validations/product.validation.js";

export type CreateProductInput = z.infer<typeof v.createProductSchema>["body"];

export type UpdateProductInput = z.infer<typeof v.updateProductSchema>["body"];

export type ProductListQuery = z.infer<
  typeof v.productListQuerySchema
>["query"];

export type CategoryAssignment = z.infer<typeof v.categoryAssignment>;
