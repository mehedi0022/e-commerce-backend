import type { z } from "zod";
import type {
  guestOrderSchema,
  orderListSchema,
  orderNumberSchema,
  orderTransitionSchema,
} from "./validations/order.validation.js";

export type OrderStatus = z.infer<typeof orderTransitionSchema>["body"]["status"];
export type PaymentStatus = NonNullable<z.infer<typeof orderListSchema>["query"]["paymentStatus"]>;
export type OrderListQuery = z.infer<typeof orderListSchema>["query"];
export type OrderTransitionInput = z.infer<typeof orderTransitionSchema>["body"];
export type OrderNumberParams = z.infer<typeof orderNumberSchema>["params"];
export type GuestOrderQuery = z.infer<typeof guestOrderSchema>;
