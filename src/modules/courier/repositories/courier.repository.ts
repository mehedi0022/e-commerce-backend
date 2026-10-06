import { db } from "../../../prisma/db.js";

export const findProviders = async () => {
  return db.orm.public.CourierProviderConfig.all();
};

export const findProviderById = async (id: number) => {
  return db.orm.public.CourierProviderConfig.first({ id });
};

export const findProviderByCode = async (code: string) => {
  const norm = code.toLowerCase().trim();
  const all = await db.orm.public.CourierProviderConfig.all();
  return all.find((p: any) => p.code.toLowerCase().trim() === norm) || null;
};

export const findActiveProvider = async () => {
  // First look for active default, then any active
  const providers = await db.orm.public.CourierProviderConfig.all();
  return (
    providers.find((p: any) => p.isActive && p.isDefault) ||
    providers.find((p: any) => p.isActive) ||
    null
  );
};

export const createProvider = async (data: any) => {
  return db.orm.public.CourierProviderConfig.create(data);
};

export const updateProvider = async (id: number, data: any) => {
  await db.orm.public.CourierProviderConfig.where({ id }).update(data);
  return findProviderById(id);
};

export const clearDefaults = async (excludeId?: number) => {
  const all = await db.orm.public.CourierProviderConfig.all();
  for (const p of all) {
    if (p.isDefault && p.id !== excludeId) {
      await db.orm.public.CourierProviderConfig.where({ id: p.id }).update({
        isDefault: false,
      });
    }
  }
};
