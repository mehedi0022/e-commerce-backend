import { z } from "zod";
import * as v from "./validations/product-variant.validation.js";
export type CreateVariantInput = z.infer<typeof v.createVariantSchema>["body"];
export type UpdateVariantInput = z.infer<typeof v.updateVariantSchema>["body"];
