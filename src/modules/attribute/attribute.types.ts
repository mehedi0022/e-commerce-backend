import { z } from "zod";
import * as v from "./validations/attribute.validation.js";
export type CreateAttributeInput = z.infer<
  typeof v.createAttributeSchema
>["body"];
export type UpdateAttributeInput = z.infer<
  typeof v.updateAttributeSchema
>["body"];
export type CreateValueInput = z.infer<typeof v.createValueSchema>["body"];
export type UpdateValueInput = z.infer<typeof v.updateValueSchema>["body"];
export type AttributeListQuery = z.infer<
  typeof v.attributeListQuerySchema
>["query"];
