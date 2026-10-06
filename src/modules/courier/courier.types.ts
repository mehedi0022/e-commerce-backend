export interface CourierProviderConfig {
  id: number;
  code: string;
  name: string;
  apiKey: string | null;
  apiSecret: string | null;
  apiUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  isLive: boolean;
  settings: Record<string, any> | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CourierBookingParams {
  order: {
    id: number;
    orderNumber: string;
    grandTotal: number | string;
    dueAmount: number | string;
    advanceAmount: number | string;
    isAdvanceRequired: boolean;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    customerNote?: string | null;
    itemsSummary?: string;
    itemCount?: number;
    weightKg?: number;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    district: string;
    division?: string | null;
    upazila?: string | null;
    thana?: string | null;
    area?: string | null;
    postalCode?: string | null;
  };
  customNote?: string;
  itemWeightKg?: number;
}

export interface CourierBookingResult {
  consignmentId: string | number;
  trackingCode: string;
  trackingUrl?: string;
  courierName: string;
  status: string;
  codAmount: number;
  rawResponse?: any;
}

export interface CourierTrackingResult {
  status: string; // e.g. "PENDING", "IN_TRANSIT", "DELIVERED", "CANCELLED", etc.
  rawStatus: string;
  courierName: string;
  trackingCode: string;
  consignmentId?: string | number;
  updatedAt?: string;
  rawResponse?: any;
}

export interface CourierBalanceResult {
  balance: number;
  currency: string;
  rawResponse?: any;
}

export interface UpdateCourierProviderInput {
  name?: string;
  apiKey?: string | null;
  apiSecret?: string | null;
  apiUrl?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  isLive?: boolean;
  settings?: Record<string, any> | null;
}
