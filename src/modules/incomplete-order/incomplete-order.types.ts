export interface IncompleteCartItem {
  variantId?: number;
  productId?: number;
  name: string;
  sku?: string;
  price: number | string;
  quantity: number;
  image?: string;
  attributes?: Record<string, string>;
}

export interface CaptureIncompleteOrderInput {
  sessionId: string;
  customerName?: string | null;
  customerPhone: string;
  customerEmail?: string | null;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    division?: string;
    district?: string;
    upazila?: string;
    thana?: string;
    area?: string;
    addressLine1?: string;
    addressLine2?: string;
  } | null;
  cartItems: IncompleteCartItem[];
  subtotal?: number | string;
  shippingFee?: number | string;
  totalAmount?: number | string;
  source?: string;
}

export interface UpdateIncompleteOrderInput {
  status?: "PENDING" | "CALLED_NO_RESPONSE" | "CONTACTED" | "CONVERTED" | "CANCELLED";
  crmNotes?: string | null;
}

export interface IncompleteOrderQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  source?: string;
}

export interface IncompleteOrderMetrics {
  totalLeads: number;
  pendingCalls: number;
  contactedCount: number;
  convertedCount: number;
  potentialRevenue: string;
  recoveredRevenue: string;
  conversionRate: string;
}

export interface ConvertIncompleteOrderInput {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    division?: string;
    district?: string;
    upazila?: string;
    thana?: string;
    area?: string;
    addressLine1?: string;
    addressLine2?: string;
    postalCode?: string;
    countryCode?: string;
  } | null;
  cartItems?: IncompleteCartItem[];
  paymentMethod?: "CASH_ON_DELIVERY" | "ONLINE";
  shippingFee?: number | string;
  advanceAmount?: number | string;
  discountAmount?: number | string;
  adminNote?: string;
}
