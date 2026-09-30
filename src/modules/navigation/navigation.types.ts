import { z } from "zod";
import * as v from "./validations/navigation.validation.js";

export type CreateMenuInput = z.infer<typeof v.createMenuSchema>["body"];
export type UpdateMenuInput = z.infer<typeof v.updateMenuSchema>["body"];
export type CreateItemInput = z.infer<typeof v.createItemSchema>["body"];
export type UpdateItemInput = z.infer<typeof v.updateItemSchema>["body"];
export type CreateSectionInput = z.infer<typeof v.createSectionSchema>["body"];
export type UpdateSectionInput = z.infer<typeof v.updateSectionSchema>["body"];
export type CreateEntryInput = z.infer<typeof v.createEntrySchema>["body"];
export type UpdateEntryInput = z.infer<typeof v.updateEntrySchema>["body"];
