import { z } from "zod";
export const create = z.object({ params: z.object({ returnNumber: z.string().min(1) }), body: z.object({ amount: z.coerce.number().positive(), method: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_BANKING", "ORIGINAL_PAYMENT_METHOD", "OTHER"]).optional(), reason: z.string().max(500).optional(), note: z.string().max(1000).optional() }) });
export const number = z.object({ params: z.object({ refundNumber: z.string().min(1) }) });
export const transition = z.object({ params: z.object({ refundNumber: z.string().min(1) }), body: z.object({ status: z.enum(["PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]), note: z.string().max(1000).optional() }) });
export const list = z.object({ query: z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20), status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]).optional(), method: z.string().optional() }) });
