import { db } from "../../../prisma/db.js";
import { uploadService } from "../../upload/upload.module.js";
import * as repo from "../repositories/product-image.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../errors/AppError.js";
type Meta = { altText?: string | null; isPrimary?: boolean; sortOrder?: number; attributeValueIds?: number[] };
const product = async (id: number) => { if (!(await repo.findProduct(id))) throw new NotFoundError("Product not found"); };
const validateValues = async (productId: number, ids: number[] = []) => { const values = await repo.findValues(ids); if (values.length !== ids.length || values.some((v: any) => !v.isActive || !v.attribute.isActive)) throw new NotFoundError("One or more attribute values are invalid or inactive"); const attrs = new Set<number>(); for (const v of values) { if (attrs.has(v.attributeId)) throw new ConflictError("An image cannot contain multiple values from the same attribute"); attrs.add(v.attributeId); } if (ids.length) { const variants = await repo.findVariants(productId); const valid = variants.some((variant: any) => { const selected = new Set(variant.attributeValues.map((x: any) => x.attributeValueId)); return ids.every((id) => selected.has(id)); }); if (!valid) throw new ConflictError("Attribute value combination is not used by any product variant"); } };
const sync = async (tx: any, imageId: number, ids: number[] | undefined) => { if (!ids) return; await repo.clearValues(tx, imageId); for (const id of ids) await repo.addValue(tx, imageId, id); };
const primary = async (tx: any, productId: number, isPrimary: boolean | undefined, ids: number[]) => { if (isPrimary && ids.length === 0) await repo.clearPrimary(tx, productId); if (isPrimary && ids.length > 0) throw new ValidationError("Only general images can be primary"); };
export const list = async (productId: number) => { await product(productId); return repo.list(productId); };
export const create = async (productId: number, file: Express.Multer.File | undefined, meta: Meta) => { await product(productId); if (!file) throw new ValidationError("Image file is required"); const ids = meta.attributeValueIds ?? []; await validateValues(productId, ids); const stored = await uploadService.upload(file, "products"); try { const image = await db.transaction(async (tx) => { await primary(tx, productId, meta.isPrimary, ids); const created = await repo.create(tx, { productId, imageUrl: stored.url, storageKey: stored.key, altText: meta.altText ?? null, isPrimary: meta.isPrimary ?? false, sortOrder: meta.sortOrder ?? 0 }); await sync(tx, created.id, ids); return created; }); return image; } catch (error) { await uploadService.delete(stored.key).catch(() => undefined); throw error; } };
export const update = async (productId: number, imageId: number, file: Express.Multer.File | undefined, meta: Meta) => {
  if (!file && Object.keys(meta).length === 0) throw new ValidationError("An image or metadata field is required");
  const current = await repo.find(productId, imageId);
  if (!current) throw new NotFoundError("Product image not found");
  const ids = meta.attributeValueIds ?? (current as any).attributeValues.map((x: any) => x.attributeValueId);
  await validateValues(productId, ids);
  const isPrimary = meta.isPrimary ?? current.isPrimary;
  if (isPrimary && ids.length) throw new ValidationError("Only general images can be primary");
  const persist = async (stored?: { url: string; key: string }) => db.transaction(async (tx) => {
    await primary(tx, productId, isPrimary, ids);
    const image = await repo.update(tx, imageId, {
      ...(stored ? { imageUrl: stored.url, storageKey: stored.key } : {}),
      ...(meta.altText !== undefined ? { altText: meta.altText } : {}),
      isPrimary,
      ...(meta.sortOrder !== undefined ? { sortOrder: meta.sortOrder } : {}),
    });
    await sync(tx, imageId, meta.attributeValueIds);
    return image;
  });
  if (!file) return persist();
  const stored = await uploadService.upload(file, "products");
  let image;
  try { image = await persist(stored); }
  catch (error) { await uploadService.delete(stored.key).catch(() => undefined); throw error; }
  // The write succeeded. A storage cleanup failure must not report it as a failed save.
  if (current.storageKey) await uploadService.delete(current.storageKey).catch(() => undefined);
  return image;
};
export const remove = async (productId: number, imageId: number) => { const current = await repo.find(productId, imageId); if (!current) throw new NotFoundError("Product image not found"); await db.transaction((tx) => repo.remove(tx, imageId)); await uploadService.delete((current as any).storageKey).catch(() => undefined); };
export const matching = async (productId: number, ids: number[]) => { const images = await list(productId); const selected = new Set(ids); return images.filter((image: any) => image.attributeValues.every((x: any) => selected.has(x.attributeValueId))).sort((a: any, b: any) => b.attributeValues.length - a.attributeValues.length || a.sortOrder - b.sortOrder); };
