import { z } from "zod";
const id = z.coerce.number().int().positive();
export const productImages = z.object({ params: z.object({ productId: id }) });
export const imageId = z.object({ params: z.object({ productId: id, imageId: id }) });
