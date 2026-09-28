import { z } from "zod";
const id = z.coerce.number().int().positive();
export const addCartItemSchema = z.object({ body: z.object({ variantId: id, quantity: z.coerce.number().int().positive() }).strict() });
export const updateCartItemSchema = z.object({ params: z.object({ itemId: id }), body: z.object({ quantity: z.coerce.number().int().positive() }).strict() });
export const cartItemSchema = z.object({ params: z.object({ itemId: id }) });
