import { db } from "../../../prisma/db.js";
import type {
  SmsProviderConfig,
  UpdateSmsProviderInput,
  NotificationTemplate,
  UpdateNotificationTemplateInput,
  SendSmsParams,
  SendSmsResult,
} from "../sms.types.js";

// ─── Provider Repository ───────────────────────────────────────────────────

export const findAllProviders = async () => {
  return db.orm.public.SmsProviderConfig.all();
};

export const findProviderById = async (id: number) => {
  return db.orm.public.SmsProviderConfig.first({ id });
};

export const findProviderByCode = async (code: string) => {
  return db.orm.public.SmsProviderConfig.first({ code });
};

export const findActiveProvider = async (): Promise<SmsProviderConfig | null> => {
  const provider = await db.orm.public.SmsProviderConfig.first({ isActive: true });
  return (provider as any) || null;
};

export const createProvider = async (data: any) => {
  return db.orm.public.SmsProviderConfig.create(data);
};

export const updateProvider = async (
  id: number,
  data: UpdateSmsProviderInput,
) => {
  // If setting this provider to active, disable all others so only ONE is active at a time
  if (data.isActive === true) {
    await db.orm.public.SmsProviderConfig.all().then(async (providers: any[]) => {
      for (const p of providers) {
        if (p.id !== id && p.isActive) {
          await db.orm.public.SmsProviderConfig.where({ id: p.id }).update({
            isActive: false,
          });
        }
      }
    });
  }

  await db.orm.public.SmsProviderConfig.where({ id }).update(data as any);
  return findProviderById(id);
};

export const deleteProvider = async (id: number) => {
  return db.orm.public.SmsProviderConfig.where({ id }).delete();
};

// ─── Templates Repository ──────────────────────────────────────────────────

export const findAllTemplates = async () => {
  return db.orm.public.NotificationTemplate.all();
};

export const findTemplateByEvent = async (event: string): Promise<NotificationTemplate | null> => {
  const tmpl = await db.orm.public.NotificationTemplate.first({ event });
  return (tmpl as any) || null;
};

export const updateTemplate = async (
  event: string,
  data: UpdateNotificationTemplateInput,
) => {
  await db.orm.public.NotificationTemplate.where({ event }).update(data as any);
  return findTemplateByEvent(event);
};

// ─── SMS Logs Repository ───────────────────────────────────────────────────

export const createSmsLog = async (data: {
  smsProviderConfigId?: number | null;
  providerCode: string;
  recipientPhone: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED";
  responsePayload?: any;
  orderId?: number | null;
}) => {
  return db.orm.public.SmsLog.create(data as any);
};

export const findSmsLogs = async (limit = 50) => {
  const logs = await db.orm.public.SmsLog
    .orderBy((l: any) => l.createdAt.desc())
    .all();
  return logs.slice(0, limit);
};
