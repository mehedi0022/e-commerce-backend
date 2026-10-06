import { z } from "zod";

const address = z.object({
  fullName: z.string().min(2), phone: z.string().min(5), addressLine1: z.string().min(2),
  addressLine2: z.string().optional(),
  divisionId: z.string().optional().nullable(), districtId: z.string().min(1).optional().nullable(),
  upazilaId: z.string().optional().nullable(), unionId: z.string().optional().nullable(),
  division: z.string().optional(), district: z.string().min(1),
  upazila: z.string().optional(), thana: z.string().optional(), area: z.string().optional(),
  postalCode: z.string().optional(), countryCode: z.string().length(2).default("BD"),
});
const common = {
  shippingMethodId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(["CASH_ON_DELIVERY", "ONLINE"]),
  paymentMethodCode: z.string().trim().optional(),
  senderNumber: z.string().trim().max(50).optional(),
  transactionId: z.string().trim().max(100).optional(),
  couponCode: z.string().trim().min(1).max(50).optional(),
  customerNote: z.string().max(1000).optional(),
  paidInFull: z.boolean().optional(),
};
export const checkoutSchema = z.object({ shippingAddressId: z.coerce.number().int().positive(), billingSameAsShipping: z.boolean().default(true), billingAddressId: z.coerce.number().int().positive().optional(), ...common }).superRefine((x, ctx) => { if (!x.billingSameAsShipping && !x.billingAddressId) ctx.addIssue({ code: "custom", path: ["billingAddressId"], message: "Billing address is required" }); });
export const guestCheckoutSchema = z.object({ customer: z.object({ name: z.string().min(2), email: z.string().email().optional(), phone: z.string().min(5) }), shippingAddress: address, billingSameAsShipping: z.boolean().default(true), billingAddress: address.optional(), ...common }).superRefine((x, ctx) => { if (!x.billingSameAsShipping && !x.billingAddress) ctx.addIssue({ code: "custom", path: ["billingAddress"], message: "Billing address is required" }); });
export const guestOrderAccessSchema = z.object({ accessToken: z.string().min(32) });
