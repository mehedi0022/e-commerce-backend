import { createHash } from "node:crypto";
import { settingRepository } from "../../setting/repositories/setting.repository.js";
import {
  type MarketingSettings,
  type PublicMarketingSettings,
  DEFAULT_MARKETING_SETTINGS,
} from "../marketing.types.js";
import { logger } from "../../../config/logger.js";

const MARKETING_SETTINGS_KEY = "marketing_tracking_settings";

export class MarketingService {
  /**
   * Returns current marketing tracking settings from database or defaults.
   */
  async getSettings(): Promise<MarketingSettings> {
    const record = await settingRepository.getByKey(MARKETING_SETTINGS_KEY);
    if (!record || !record.value) {
      return DEFAULT_MARKETING_SETTINGS;
    }

    return {
      facebook: {
        ...DEFAULT_MARKETING_SETTINGS.facebook,
        ...(record.value.facebook || {}),
      },
      google: {
        ...DEFAULT_MARKETING_SETTINGS.google,
        ...(record.value.google || {}),
      },
      tiktok: {
        ...DEFAULT_MARKETING_SETTINGS.tiktok,
        ...(record.value.tiktok || {}),
      },
      trackingPreferences: {
        ...DEFAULT_MARKETING_SETTINGS.trackingPreferences,
        ...(record.value.trackingPreferences || {}),
      },
    };
  }

  /**
   * Returns public-safe marketing settings (IDs only, no access tokens) for storefront initialization.
   */
  async getPublicSettings(): Promise<PublicMarketingSettings> {
    const settings = await this.getSettings();
    return {
      facebook: {
        enabled: Boolean(settings.facebook.enabled && settings.facebook.pixelId),
        pixelId: settings.facebook.pixelId || "",
        capiEnabled: Boolean(settings.facebook.capiEnabled && settings.facebook.accessToken),
      },
      google: {
        enabled: Boolean(settings.google.enabled && (settings.google.gtmContainerId || settings.google.ga4MeasurementId)),
        gtmContainerId: settings.google.gtmContainerId || "",
        ga4MeasurementId: settings.google.ga4MeasurementId || "",
        googleAdsConversionId: settings.google.googleAdsConversionId || "",
        googleAdsConversionLabel: settings.google.googleAdsConversionLabel || "",
      },
      tiktok: {
        enabled: Boolean(settings.tiktok.enabled && settings.tiktok.pixelId),
        pixelId: settings.tiktok.pixelId || "",
        eventsApiEnabled: Boolean(settings.tiktok.eventsApiEnabled && settings.tiktok.accessToken),
      },
      trackingPreferences: settings.trackingPreferences,
    };
  }

  /**
   * Updates marketing settings in the database.
   */
  async updateSettings(data: Partial<MarketingSettings>): Promise<MarketingSettings> {
    const current = await this.getSettings();
    const merged: MarketingSettings = {
      facebook: { ...current.facebook, ...(data.facebook || {}) },
      google: { ...current.google, ...(data.google || {}) },
      tiktok: { ...current.tiktok, ...(data.tiktok || {}) },
      trackingPreferences: { ...current.trackingPreferences, ...(data.trackingPreferences || {}) },
    };

    await settingRepository.upsert(
      MARKETING_SETTINGS_KEY,
      merged,
      "Pixel, Conversions API (CAPI), GTM, GA4, and TikTok tracking configuration"
    );

    return merged;
  }

  /**
   * Formats string to SHA-256 lowercase hex hash (standard requirement for Meta & TikTok PII).
   */
  hashSha256(value?: string | null): string | undefined {
    if (!value) return undefined;
    const clean = value.trim().toLowerCase();
    if (!clean) return undefined;
    return createHash("sha256").update(clean).digest("hex");
  }

  /**
   * Normalizes phone number to E.164 without plus or spaces for Meta/TikTok (e.g. 01712345678 -> 8801712345678)
   */
  normalizePhone(phone?: string | null): string | undefined {
    if (!phone) return undefined;
    let clean = phone.replace(/\D/g, "");
    if (clean.startsWith("01") && clean.length === 11) {
      clean = `880${clean.slice(1)}`;
    }
    return clean || undefined;
  }

  /**
   * Sends verified server-side Purchase event to Meta Conversions API (CAPI) with 100% deterministic deduplication.
   */
  async sendMetaCapiPurchase(params: {
    order: any;
    customer?: { name?: string; phone?: string; email?: string } | null;
    items?: Array<{ variantId?: number; name?: string; quantity: number; unitPrice: number }> | null;
    clientIp?: string | null;
    userAgent?: string | null;
    fbp?: string | null;
    fbc?: string | null;
    testEventCodeOverride?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const settings = await this.getSettings();
    if (!settings.facebook.enabled || !settings.facebook.capiEnabled || !settings.facebook.pixelId || !settings.facebook.accessToken) {
      return { success: false, error: "Meta CAPI is disabled or not configured." };
    }

    const { order, customer, clientIp, userAgent, fbp, fbc, testEventCodeOverride } = params;
    const prefix = settings.trackingPreferences?.deduplicationPrefix || "order_";
    const eventId = `${prefix}${order.id}`;

    // Split name into first and last
    const fullName = (customer?.name || order.shippingAddress?.fullName || "").trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const hashedEmail = this.hashSha256(customer?.email);
    const normalizedPhone = this.normalizePhone(customer?.phone || order.shippingAddress?.phone);
    const hashedPhone = this.hashSha256(normalizedPhone);
    const hashedFn = this.hashSha256(firstName);
    const hashedLn = this.hashSha256(lastName);

    const testCode = testEventCodeOverride?.trim() || settings.facebook.testEventCode?.trim();

    const userData: Record<string, any> = {
      ...(hashedEmail ? { em: [hashedEmail] } : {}),
      ...(hashedPhone ? { ph: [hashedPhone] } : {}),
      ...(hashedFn ? { fn: [hashedFn] } : {}),
      ...(hashedLn ? { ln: [hashedLn] } : {}),
      ...(clientIp ? { client_ip_address: clientIp } : {}),
      ...(userAgent ? { client_user_agent: userAgent } : {}),
      ...(fbp ? { fbp } : {}),
      ...(fbc ? { fbc } : {}),
    };

    const contents = (params.items || []).map((item) => ({
      id: String(item.variantId || item.name || "item"),
      quantity: item.quantity,
      item_price: Number(item.unitPrice),
    }));

    const eventPayload = {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId, // EXACT SAME event_id as browser pixel for automatic deduplication
      action_source: "website",
      user_data: userData,
      custom_data: {
        currency: "BDT",
        value: Number(order.grandTotal),
        order_id: String(order.id),
        content_type: "product",
        contents,
        num_items: contents.reduce((acc, curr) => acc + curr.quantity, 0) || 1,
      },
    };

    const requestBody: Record<string, any> = {
      data: [eventPayload],
      ...(testCode ? { test_event_code: testCode } : {}),
    };

    try {
      const url = `https://graph.facebook.com/v21.0/${settings.facebook.pixelId}/events?access_token=${settings.facebook.accessToken}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(8000),
      });

      const json = await response.json();
      if (!response.ok) {
        logger.warn({ error: json, orderId: order.id }, "[Meta CAPI] Purchase event rejected by Meta");
        return { success: false, error: json.error?.message || "Meta API error", data: json };
      }

      logger.info(
        { events_received: json.events_received, fbtrace_id: json.fbtrace_id, eventId },
        "[Meta CAPI] Purchase event dispatched successfully"
      );
      return { success: true, data: json };
    } catch (err: any) {
      logger.error({ error: err.message, orderId: order.id }, "[Meta CAPI] Failed to call Meta Graph API");
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends live test event to Meta CAPI to verify credentials and test_event_code in Meta Events Manager.
   */
  async testMetaCapiConnection(pixelId: string, accessToken: string, testEventCode: string): Promise<any> {
    const testEvent = {
      event_name: "PageView",
      event_time: Math.floor(Date.now() / 1000),
      event_id: `test_${Date.now()}`,
      action_source: "website",
      user_data: {
        client_user_agent: "NextGen-Store-Admin-Test-Runner/1.0",
        em: [createHash("sha256").update("test@nextgen-shop.com").digest("hex")],
      },
      custom_data: {
        status: "Diagnostic Verification Test",
        timestamp: new Date().toISOString(),
      },
    };

    const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [testEvent],
        test_event_code: testEventCode.trim(),
      }),
      signal: AbortSignal.timeout(8000),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message || `Meta API Error (${response.status})`);
    }

    return json;
  }

  /**
   * Sends server purchase event to TikTok Events API.
   */
  async sendTikTokEventsApiPurchase(params: {
    order: any;
    customer?: { name?: string; phone?: string; email?: string } | null;
    clientIp?: string | null;
    userAgent?: string | null;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const settings = await this.getSettings();
    if (!settings.tiktok.enabled || !settings.tiktok.eventsApiEnabled || !settings.tiktok.pixelId || !settings.tiktok.accessToken) {
      return { success: false, error: "TikTok Events API not configured." };
    }

    const { order, customer, clientIp, userAgent } = params;
    const prefix = settings.trackingPreferences?.deduplicationPrefix || "order_";
    const eventId = `${prefix}${order.id}`;

    const normalizedPhone = this.normalizePhone(customer?.phone || order.shippingAddress?.phone);

    const payload = {
      event_source: "web",
      event_source_id: settings.tiktok.pixelId,
      data: [
        {
          event: "CompletePayment",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          user: {
            ...(customer?.email ? { email: this.hashSha256(customer.email) } : {}),
            ...(normalizedPhone ? { phone_number: this.hashSha256(normalizedPhone) } : {}),
            ...(clientIp ? { ip: clientIp } : {}),
            ...(userAgent ? { user_agent: userAgent } : {}),
          },
          properties: {
            currency: "BDT",
            value: Number(order.grandTotal),
            order_id: String(order.id),
          },
        },
      ],
      ...(settings.tiktok.testEventCode ? { test_event_code: settings.tiktok.testEventCode } : {}),
    };

    try {
      const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": settings.tiktok.accessToken,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      const json = await response.json();
      return { success: json.code === 0, data: json };
    } catch (err: any) {
      logger.error({ error: err.message }, "[TikTok Events API] Request failed");
      return { success: false, error: err.message };
    }
  }

  /**
   * Asynchronously dispatches server purchase events (CAPI / TikTok) for an order without blocking the user response.
   */
  dispatchServerPurchaseEvents(params: {
    order: any;
    customer?: { name?: string; phone?: string; email?: string } | null;
    items?: Array<{ variantId?: number; name?: string; quantity: number; unitPrice: number }> | null;
    req?: any;
  }): void {
    const clientIp = params.req?.headers?.["x-forwarded-for"]?.toString()?.split(",")?.[0]?.trim() || params.req?.ip || null;
    const userAgent = params.req?.headers?.["user-agent"] || null;
    const fbp = params.req?.cookies?.["_fbp"] || null;
    const fbc = params.req?.cookies?.["_fbc"] || null;

    // Fire in background non-blocking
    Promise.allSettled([
      this.sendMetaCapiPurchase({
        order: params.order,
        customer: params.customer,
        items: params.items,
        clientIp,
        userAgent,
        fbp,
        fbc,
      }),
      this.sendTikTokEventsApiPurchase({
        order: params.order,
        customer: params.customer,
        clientIp,
        userAgent,
      }),
    ]).catch((err) => {
      logger.error({ error: err }, "[MarketingService] Background server tracking failed");
    });
  }
}

export const marketingService = new MarketingService();
