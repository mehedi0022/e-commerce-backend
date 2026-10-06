export type SmsDeliveryStatus = "PENDING" | "SENT" | "FAILED";

export interface SmsProviderConfig {
  id: number;
  code: string;
  name: string;
  senderId?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  apiUrl?: string | null;
  isActive: boolean;
  isDefault: boolean;
  settings?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: number;
  event: string;
  name: string;
  smsEnabled: boolean;
  smsTemplate: string;
  emailEnabled: boolean;
  emailSubject: string;
  emailTemplate?: string | null;
  availableVars?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SmsLog {
  id: number;
  smsProviderConfigId?: number | null;
  providerCode: string;
  recipientPhone: string;
  message: string;
  status: SmsDeliveryStatus;
  responsePayload?: Record<string, any> | null;
  orderId?: number | null;
  createdAt: Date;
  provider?: SmsProviderConfig | null;
}

export interface SendSmsParams {
  to: string;
  message: string;
  orderId?: number;
}

export interface SendSmsResult {
  success: boolean;
  status: SmsDeliveryStatus;
  responsePayload?: any;
  errorMessage?: string;
}

export interface CheckBalanceResult {
  balance: number | string;
  rawResponse?: any;
}

export interface SmsProviderAdapter {
  sendSms(config: SmsProviderConfig, params: SendSmsParams): Promise<SendSmsResult>;
  checkBalance?(config: SmsProviderConfig): Promise<CheckBalanceResult>;
}

export interface UpdateSmsProviderInput {
  name?: string;
  senderId?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  apiUrl?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  settings?: Record<string, any> | null;
}

export interface UpdateNotificationTemplateInput {
  smsEnabled?: boolean;
  smsTemplate?: string;
  emailEnabled?: boolean;
  emailSubject?: string;
  emailTemplate?: string | null;
}
