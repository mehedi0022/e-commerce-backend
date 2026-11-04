import { z } from "zod";

export const updateMarketingSettingsSchema = z.object({
  body: z.object({
    facebook: z
      .object({
        enabled: z.boolean(),
        pixelId: z.string().trim().max(100),
        capiEnabled: z.boolean(),
        accessToken: z.string().trim().max(500),
        testEventCode: z.string().trim().max(100).optional(),
      })
      .partial(),
    google: z
      .object({
        enabled: z.boolean(),
        gtmContainerId: z.string().trim().max(100),
        ga4MeasurementId: z.string().trim().max(100),
        googleAdsConversionId: z.string().trim().max(100).optional(),
        googleAdsConversionLabel: z.string().trim().max(100).optional(),
      })
      .partial(),
    tiktok: z
      .object({
        enabled: z.boolean(),
        pixelId: z.string().trim().max(100),
        eventsApiEnabled: z.boolean(),
        accessToken: z.string().trim().max(500).optional(),
        testEventCode: z.string().trim().max(100).optional(),
      })
      .partial(),
    trackingPreferences: z
      .object({
        trackPageView: z.boolean().optional(),
        trackViewContent: z.boolean().optional(),
        trackAddToCart: z.boolean().optional(),
        trackInitiateCheckout: z.boolean().optional(),
        trackPurchase: z.boolean().optional(),
        deduplicationPrefix: z.string().trim().max(50).optional(),
      })
      .partial()
      .optional(),
  }),
});

export const testMetaCapiSchema = z.object({
  body: z.object({
    pixelId: z.string().trim().min(1, "Pixel ID is required"),
    accessToken: z.string().trim().min(1, "Access Token is required"),
    testEventCode: z.string().trim().min(1, "Test Event Code is required (e.g. TEST12345)"),
  }),
});

export const testTikTokSchema = z.object({
  body: z.object({
    pixelId: z.string().trim().min(1, "TikTok Pixel ID is required"),
    accessToken: z.string().trim().min(1, "Access Token is required"),
    testEventCode: z.string().trim().optional(),
  }),
});
