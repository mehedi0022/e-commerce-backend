import { z } from "zod";
const status = z.enum(["PENDING", "READY_TO_SHIP", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED", "CANCELLED"]);
export const createShipment = z.object({ params: z.object({ orderNumber: z.string().min(1) }), body: z.object({ courierName: z.string().trim().max(100).nullable().optional(), trackingNumber: z.string().trim().max(150).nullable().optional(), trackingUrl: z.string().url().nullable().optional(), note: z.string().max(1000).nullable().optional() }) });
export const updateShipment = createShipment;
export const transitionShipment = z.object({ params: z.object({ orderNumber: z.string().min(1) }), body: z.object({ status, note: z.string().max(1000).nullable().optional() }) });
export const orderNumber = z.object({ params: z.object({ orderNumber: z.string().min(1) }) });
export const listShipment = z.object({ query: z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20), status: status.optional(), courierName: z.string().optional(), trackingNumber: z.string().optional() }) });
