import { z } from "zod";
export const productId = z.object({ params: z.object({ productId: z.coerce.number().int().positive() }) });
export const list = z.object({ query: z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20) }) });
