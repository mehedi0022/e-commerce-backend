import { z } from "zod";
import * as v from "./validations/inventory.validation.js";

export type InitializeInput = z.infer<typeof v.initializeSchema>["body"];
export type QuantityInput = z.infer<typeof v.quantitySchema>["body"];
export type AdjustmentInput = z.infer<typeof v.adjustmentSchema>["body"];
export type MovementQuery = z.infer<typeof v.movementQuerySchema>["query"];
export type ThresholdInput = z.infer<typeof v.thresholdSchema>["body"];
export type InventoryListQuery = z.infer<typeof v.inventoryListQuerySchema>["query"];
export type GlobalMovementsQuery = z.infer<typeof v.globalMovementsQuerySchema>["query"];

