import type { PaymentMethodConfig } from "../payment.types.js";

export interface InitiatePaymentParams {
  order: {
    id: number;
    orderNumber: string;
    grandTotal: string | number;
    customerName: string;
    customerEmail?: string | null;
    customerPhone: string;
  };
  shippingAddress?: {
    addressLine1: string;
    district: string;
    postalCode?: string | null;
  } | null;
  callbackUrls: {
    successUrl: string;
    failUrl: string;
    cancelUrl: string;
    ipnUrl: string;
  };
}

export interface InitiatePaymentResult {
  gatewayUrl: string;
  sessionKey?: string;
  transactionId?: string;
  gatewayResponse?: any;
}

export interface VerifyGatewayPaymentParams {
  transactionId?: string;
  payload: any;
}

export interface VerifyGatewayPaymentResult {
  isValid: boolean;
  status: "VERIFIED" | "REJECTED";
  amount: number;
  transactionId: string;
  rawResponse: any;
  message?: string;
}

export interface PaymentGatewayAdapter {
  initiatePayment(
    config: PaymentMethodConfig,
    params: InitiatePaymentParams
  ): Promise<InitiatePaymentResult>;

  verifyPayment(
    config: PaymentMethodConfig,
    params: VerifyGatewayPaymentParams
  ): Promise<VerifyGatewayPaymentResult>;
}
