export type PaymentMethodType =
  | "COD"
  | "MANUAL_MFS"
  | "MANUAL_BANK"
  | "AUTOMATED_GATEWAY";

export type PaymentAccountType = "PERSONAL" | "AGENT" | "MERCHANT";

export type PaymentTransactionStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "REFUNDED";

export interface PaymentMethodConfig {
  id: number;
  code: string;
  name: string;
  type: PaymentMethodType;
  accountType: PaymentAccountType;
  accountNumber?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  routingNumber?: string | null;
  instructions?: string | null;
  qrCodeUrl?: string | null;
  chargePercentage: number;
  chargeFlat: number;
  isActive: boolean;
  isLive: boolean;
  credentials?: Record<string, any> | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentMethodInput {
  code: string;
  name: string;
  type: PaymentMethodType;
  accountType?: PaymentAccountType;
  accountNumber?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  routingNumber?: string | null;
  instructions?: string | null;
  qrCodeUrl?: string | null;
  chargePercentage?: number;
  chargeFlat?: number;
  isActive?: boolean;
  isLive?: boolean;
  credentials?: Record<string, any> | null;
  sortOrder?: number;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  type?: PaymentMethodType;
  accountType?: PaymentAccountType;
  accountNumber?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  routingNumber?: string | null;
  instructions?: string | null;
  qrCodeUrl?: string | null;
  chargePercentage?: number;
  chargeFlat?: number;
  isActive?: boolean;
  isLive?: boolean;
  credentials?: Record<string, any> | null;
  sortOrder?: number;
}

export interface OrderPaymentTransaction {
  id: number;
  orderId: number;
  paymentMethodCode: string;
  paymentMethodConfigId?: number | null;
  type: PaymentMethodType;
  senderNumber?: string | null;
  transactionId?: string | null;
  bankTransferReference?: string | null;
  amount: number;
  chargeAmount: number;
  status: PaymentTransactionStatus;
  receiptImageUrl?: string | null;
  adminNote?: string | null;
  verifiedByUserId?: number | null;
  verifiedAt?: Date | null;
  gatewayPayload?: Record<string, any> | null;
  gatewayResponse?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  verifiedByUser?: {
    id: number;
    fullName: string | null;
    email: string;
  } | null;
}

export interface VerifyPaymentInput {
  status: "VERIFIED" | "REJECTED";
  adminNote?: string;
}
