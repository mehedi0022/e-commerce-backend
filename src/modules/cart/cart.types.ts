import { z } from "zod";
import * as v from "./validations/cart.validation.js";
export type AddCartItemInput = z.infer<typeof v.addCartItemSchema>["body"];
export type UpdateCartItemInput = z.infer<typeof v.updateCartItemSchema>["body"];
