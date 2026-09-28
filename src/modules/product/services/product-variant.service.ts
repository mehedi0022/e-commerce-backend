import { db } from "../../../prisma/db.js";
import * as repo from "../repositories/product-variant.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../errors/AppError.js";
import type { CreateVariantInput, UpdateVariantInput } from "../product-variant.types.js";
const product = async (id: number) => { if (!(await repo.findProduct(id))) throw new NotFoundError("Product not found"); };
const validateValues = async (productId: number, ids: number[]) => {
  const values = await repo.findAttributeValues(ids);
  if (values.length !== ids.length || values.some((v: any) => !v.isActive || !v.attribute.isActive)) throw new NotFoundError("One or more attribute values are invalid or inactive");
  const attributes = new Set<number>(); for (const v of values) { if (attributes.has(v.attributeId)) throw new ConflictError("A variant cannot contain multiple values from the same attribute"); attributes.add(v.attributeId); }
  const categories = await repo.findProductCategories(productId); const primary = categories.find((c: any) => c.isPrimary) ?? categories[0];
  if (!primary) throw new ValidationError("Product must have a category before creating variants");
  const allowed = await repo.findAllowedAttributes([primary.categoryId]); const allowedIds = new Set(allowed.map((x: any) => x.attributeId));
  if (values.some((v: any) => !allowedIds.has(v.attributeId))) throw new ConflictError("An attribute is not allowed for the product category");
  for (const required of allowed.filter((x: any) => x.isRequired)) if (!attributes.has(required.attributeId)) throw new ValidationError("A required product attribute is missing");
};
const combinationExists = async (productId: number, ids: number[], exclude?: number) => { const wanted = [...ids].sort((a, b) => a - b).join(","); const variants = await repo.list(productId); return variants.some((v: any) => v.id !== exclude && v.attributeValues.map((x: any) => x.attributeValueId).sort((a: number, b: number) => a - b).join(",") === wanted); };
const syncValues = async (tx: any, variantId: number, ids: number[] | undefined) => { if (!ids) return; await repo.clearValues(tx, variantId); for (const id of ids) await repo.addValue(tx, variantId, id); };
export const list = async (productId: number) => { await product(productId); return repo.list(productId); };
export const get = async (productId: number, variantId: number) => { await product(productId); const v = await repo.findVariant(productId, variantId); if (!v) throw new NotFoundError("Product variant not found"); return v; };
export const create = async (productId: number, data: CreateVariantInput) => { await product(productId); const sku = await repo.findBySku(data.sku); if (sku) throw new ConflictError("SKU already exists"); await validateValues(productId, data.attributeValueIds); if (await combinationExists(productId, data.attributeValueIds)) throw new ConflictError("This attribute combination already exists"); return db.transaction(async (tx) => { const v = await repo.create(tx, productId, data); await syncValues(tx, v.id, data.attributeValueIds); return v; }); };
export const update = async (productId: number, variantId: number, data: UpdateVariantInput) => { await get(productId, variantId); if (data.sku) { const sku = await repo.findBySku(data.sku); if (sku && sku.id !== variantId) throw new ConflictError("SKU already exists"); } if (data.attributeValueIds) { await validateValues(productId, data.attributeValueIds); if (await combinationExists(productId, data.attributeValueIds, variantId)) throw new ConflictError("This attribute combination already exists"); } const { attributeValueIds: _attributeValueIds, ...variantData } = data; return db.transaction(async (tx) => { const v = await repo.update(tx, variantId, variantData); await syncValues(tx, variantId, data.attributeValueIds); return v; }); };
export const remove = async (productId: number, variantId: number) => { await get(productId, variantId); await db.transaction((tx) => repo.remove(tx, variantId)); };
