import { z } from "zod";
import * as v from "./validations/popup.validation.js";
export type CreatePopupInput = z.infer<typeof v.createPopupSchema>["body"];
export type UpdatePopupInput = z.infer<typeof v.updatePopupSchema>["body"];
export type PopupListQuery = z.infer<typeof v.popupListQuerySchema>["query"];
