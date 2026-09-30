import { z } from "zod";

const id = z.coerce.number().int().positive();
const menuParams = z.object({ menuId: id });
const itemParams = z.object({ menuId: id, itemId: id });
const sectionParams = z.object({ menuId: id, itemId: id, sectionId: id });
const entryParams = z.object({ menuId: id, itemId: id, sectionId: id, entryId: id });
const type = z.enum(["LINK", "CATEGORY", "MEGA_MENU"]);

export const menuIdSchema = z.object({ params: menuParams });
export const itemIdSchema = z.object({ params: itemParams });
export const sectionIdSchema = z.object({ params: sectionParams });
export const entryIdSchema = z.object({ params: entryParams });

export const createMenuSchema = z.object({
  body: z.object({ name: z.string().trim().min(1).max(150), key: z.string().trim().min(1).max(100).regex(/^[a-z0-9][a-z0-9_-]*$/), isActive: z.boolean().optional() }).strict(),
});
export const updateMenuSchema = z.object({
  params: menuParams,
  body: z.object({ name: z.string().trim().min(1).max(150).optional(), key: z.string().trim().min(1).max(100).regex(/^[a-z0-9][a-z0-9_-]*$/).optional(), isActive: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0, "At least one menu field is required"),
});
export const createItemSchema = z.object({
  params: menuParams,
  body: z.object({ label: z.string().trim().min(1).max(150), type, url: z.string().trim().max(1000).nullable().optional(), categoryId: id.nullable().optional(), sortOrder: z.coerce.number().int().min(0).optional(), isActive: z.boolean().optional(), openNewTab: z.boolean().optional() }).strict(),
});
export const updateItemSchema = z.object({
  params: itemParams,
  body: z.object({ label: z.string().trim().min(1).max(150).optional(), type: type.optional(), url: z.string().trim().max(1000).nullable().optional(), categoryId: id.nullable().optional(), sortOrder: z.coerce.number().int().min(0).optional(), isActive: z.boolean().optional(), openNewTab: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0, "At least one item field is required"),
});

export const createSectionSchema = z.object({
  params: itemParams,
  body: z.object({ title: z.string().trim().min(1).max(150), sortOrder: z.coerce.number().int().min(0).optional(), isActive: z.boolean().optional() }).strict(),
});
export const updateSectionSchema = z.object({
  params: sectionParams,
  body: z.object({ title: z.string().trim().min(1).max(150).optional(), sortOrder: z.coerce.number().int().min(0).optional(), isActive: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0, "At least one section field is required"),
});
export const createEntrySchema = z.object({
  params: sectionParams,
  body: z.object({ label: z.string().trim().min(1).max(150), type: z.enum(["LINK", "CATEGORY", "PRODUCT"]), url: z.string().trim().max(1000).nullable().optional(), categoryId: id.nullable().optional(), productId: id.nullable().optional(), sortOrder: z.coerce.number().int().min(0).optional(), isActive: z.boolean().optional(), openNewTab: z.boolean().optional() }).strict(),
});
export const updateEntrySchema = z.object({
  params: entryParams,
  body: z.object({ label: z.string().trim().min(1).max(150).optional(), type: z.enum(["LINK", "CATEGORY", "PRODUCT"]).optional(), url: z.string().trim().max(1000).nullable().optional(), categoryId: id.nullable().optional(), productId: id.nullable().optional(), sortOrder: z.coerce.number().int().min(0).optional(), isActive: z.boolean().optional(), openNewTab: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0, "At least one entry field is required"),
});
