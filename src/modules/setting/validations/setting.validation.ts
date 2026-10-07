import { z } from "zod";

export const updateInvoiceSettingsSchema = z.object({
  body: z.object({
    storeName: z.string().trim().min(1, "Store name is required").max(120),
    storeTagline: z.string().trim().max(200).optional().default(""),
    logoUrl: z.string().trim().max(1000).optional().nullable(),
    binNumber: z.string().trim().max(100).optional().default(""),

    storeAddress: z.string().trim().min(1, "Store address is required").max(500),
    supportPhone: z.string().trim().min(1, "Support phone is required").max(50),
    supportEmail: z.string().trim().email("Invalid support email").max(120),
    websiteUrl: z.string().trim().max(200).optional().default(""),

    termsAndConditions: z.string().trim().max(2000).optional().default(""),
    footerNote: z.string().trim().max(500).optional().default(""),
    showCustomerSignature: z.boolean().optional().default(true),
    showAuthorizedSignature: z.boolean().optional().default(true),

    defaultLabelSize: z.enum(["A4", "4x6", "80mm"]).optional().default("A4"),
    defaultDispatchNote: z.string().trim().max(200).optional().default(""),
    showMerchantReturn: z.boolean().optional().default(true),
    showItemsSummary: z.boolean().optional().default(true),
    showBarcodes: z.boolean().optional().default(true),
  }),
});
