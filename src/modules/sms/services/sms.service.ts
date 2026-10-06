import * as repo from "../repositories/sms.repository.js";
import { getSmsAdapter } from "../sms.factory.js";
import { NotFoundError, ConflictError, ValidationError } from "../../../errors/AppError.js";
import type {
  UpdateSmsProviderInput,
  UpdateNotificationTemplateInput,
  SendSmsParams,
  SendSmsResult,
} from "../sms.types.js";

// ─── Provider Management ───────────────────────────────────────────────────

export const getAllProviders = async () => {
  const providers = await repo.findAllProviders();

  // Strip sensitive secrets when listing
  return providers.map((p: any) => ({
    ...p,
    apiKey: p.apiKey ? "••••••••••••" + p.apiKey.slice(-4) : null,
    apiSecret: p.apiSecret ? "••••••••••••" : null,
  }));
};

export const getProviderById = async (id: number) => {
  const provider = await repo.findProviderById(id);
  if (!provider) throw new NotFoundError("SMS provider not found");
  return provider;
};

export const createProvider = async (data: {
  code: string;
  name: string;
  senderId?: string;
  apiKey?: string;
  apiSecret?: string;
  apiUrl?: string;
  isActive?: boolean;
}) => {
  const existing = await repo.findProviderByCode(data.code);
  if (existing) {
    throw new ConflictError(`Provider with code "${data.code}" already exists`);
  }
  return repo.createProvider(data);
};

export const updateProvider = async (id: number, data: UpdateSmsProviderInput) => {
  await getProviderById(id);
  return repo.updateProvider(id, data);
};

export const deleteProvider = async (id: number) => {
  await getProviderById(id);
  return repo.deleteProvider(id);
};

export const checkProviderBalance = async (id: number) => {
  const provider = await getProviderById(id);
  const adapter = getSmsAdapter(provider as any);

  if (!adapter.checkBalance) {
    return { balance: "N/A" };
  }

  return adapter.checkBalance(provider as any);
};

// ─── Notification Templates ────────────────────────────────────────────────

export const getAllTemplates = async () => {
  return repo.findAllTemplates();
};

export const updateTemplate = async (
  event: string,
  data: UpdateNotificationTemplateInput,
) => {
  const existing = await repo.findTemplateByEvent(event);
  if (!existing) throw new NotFoundError("Notification template not found");
  return repo.updateTemplate(event, data);
};

// ─── Sending SMS Core Engine ────────────────────────────────────────────────

export const sendSms = async (params: SendSmsParams): Promise<SendSmsResult> => {
  const activeProvider = await repo.findActiveProvider();

  if (!activeProvider) {
    // No SMS provider enabled in system
    return {
      success: false,
      status: "FAILED",
      errorMessage: "No active SMS provider is configured in the system",
    };
  }

  const adapter = getSmsAdapter(activeProvider);
  const result = await adapter.sendSms(activeProvider, params);

  // Record audit log
  await repo.createSmsLog({
    smsProviderConfigId: activeProvider.id,
    providerCode: activeProvider.code,
    recipientPhone: params.to,
    message: params.message,
    status: result.status,
    responsePayload: result.responsePayload,
    orderId: params.orderId || null,
  });

  return result;
};

// ─── Send Test SMS ──────────────────────────────────────────────────────────

export const sendTestSms = async (phone: string) => {
  if (!phone || phone.length < 10) {
    throw new ValidationError("Valid phone number is required");
  }

  return sendSms({
    to: phone,
    message: "Test SMS from your E-Commerce Store! SMS gateway is working perfectly.",
  });
};

export const getSmsLogs = async (limit = 50) => {
  return repo.findSmsLogs(limit);
};
