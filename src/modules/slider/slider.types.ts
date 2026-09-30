import { z } from "zod";
import * as v from "./validations/slider.validation.js";
export type CreateSliderInput = z.infer<typeof v.createSliderSchema>["body"];
export type UpdateSliderInput = z.infer<typeof v.updateSliderSchema>["body"];
export type SliderListQuery = z.infer<typeof v.sliderListQuerySchema>["query"];
