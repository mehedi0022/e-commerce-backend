export interface FacebookTrackingConfig {
  enabled: boolean;
  pixelId: string;
  capiEnabled: boolean;
  accessToken: string;
  testEventCode?: string;
}

export interface GoogleTrackingConfig {
  enabled: boolean;
  gtmContainerId: string;
  ga4MeasurementId: string;
  googleAdsConversionId?: string;
  googleAdsConversionLabel?: string;
}

export interface TikTokTrackingConfig {
  enabled: boolean;
  pixelId: string;
  eventsApiEnabled: boolean;
  accessToken?: string;
  testEventCode?: string;
}

export interface TrackingPreferences {
  trackPageView: boolean;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  deduplicationPrefix: string;
}

export interface MarketingSettings {
  facebook: FacebookTrackingConfig;
  google: GoogleTrackingConfig;
  tiktok: TikTokTrackingConfig;
  trackingPreferences: TrackingPreferences;
}

export interface PublicMarketingSettings {
  facebook: {
    enabled: boolean;
    pixelId: string;
    capiEnabled: boolean;
  };
  google: {
    enabled: boolean;
    gtmContainerId: string;
    ga4MeasurementId: string;
    googleAdsConversionId?: string;
    googleAdsConversionLabel?: string;
  };
  tiktok: {
    enabled: boolean;
    pixelId: string;
    eventsApiEnabled: boolean;
  };
  trackingPreferences: TrackingPreferences;
}

export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  facebook: {
    enabled: false,
    pixelId: "",
    capiEnabled: false,
    accessToken: "",
    testEventCode: "",
  },
  google: {
    enabled: false,
    gtmContainerId: "",
    ga4MeasurementId: "",
    googleAdsConversionId: "",
    googleAdsConversionLabel: "",
  },
  tiktok: {
    enabled: false,
    pixelId: "",
    eventsApiEnabled: false,
    accessToken: "",
    testEventCode: "",
  },
  trackingPreferences: {
    trackPageView: true,
    trackViewContent: true,
    trackAddToCart: true,
    trackInitiateCheckout: true,
    trackPurchase: true,
    deduplicationPrefix: "order_",
  },
};
