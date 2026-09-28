import { z } from "zod";
const editable = { rating: z.coerce.number().int().min(1).max(5), title: z.string().trim().max(150).nullable().optional(), comment: z.string().trim().max(5000).nullable().optional() };
export const create = z.object({ body: z.object({ orderItemId: z.coerce.number().int().positive(), ...editable }) });
export const update = z.object({ params: z.object({ id: z.coerce.number().int().positive() }), body: z.object(editable).partial() });
export const id = z.object({ params: z.object({ id: z.coerce.number().int().positive() }) });
export const product = z.object({ params: z.object({ slug: z.string().min(1) }), query: z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20), sort: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest") }) });
export const adminList = z.object({ query: z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20), status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(), rating: z.coerce.number().int().min(1).max(5).optional(), productId: z.coerce.number().int().positive().optional(), userId: z.coerce.number().int().positive().optional() }) });
