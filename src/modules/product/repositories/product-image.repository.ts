import { db } from "../../../prisma/db.js";
const fields = ["id", "productId", "imageUrl", "storageKey", "altText", "isPrimary", "sortOrder", "createdAt", "updatedAt"] as const;
const withValues = (q: any) =>
  q.include("attributeValues", (m: any) =>
    m.include("attributeValue", (v: any) =>
      v.include("attribute", (a: any) => a.select("id", "name")),
    ),
  );
export const findProduct = (id: number) => db.orm.public.Product.select("id").first({ id });
export const find = (productId: number, id: number) => withValues(db.orm.public.ProductImage.select(...fields)).first({ productId, id });
export const list = (productId: number) => withValues(db.orm.public.ProductImage.select(...fields)).where({ productId }).orderBy([(i: any) => i.sortOrder.asc(), (i: any) => i.id.asc()]).all();
export const findValues = (ids: number[]) => db.orm.public.AttributeValue.select("id", "attributeId", "value", "isActive").where((v: any) => v.id.in(ids)).include("attribute", (a: any) => a.select("id", "isActive")).all();
export const findVariants = (productId: number) => db.orm.public.ProductVariant.select("id").where({ productId }).include("attributeValues", (m: any) => m.select("attributeValueId")).all();
export const clearPrimary = (tx: any, productId: number) => tx.orm.public.ProductImage.where({ productId, isPrimary: true }).select("id").update({ isPrimary: false });
export const create = (tx: any, data: Record<string, unknown>) => tx.orm.public.ProductImage.select(...fields).create(data);
export const update = (tx: any, id: number, data: Record<string, unknown>) => tx.orm.public.ProductImage.where({ id }).select(...fields).update(data);
export const addValue = (tx: any, productImageId: number, attributeValueId: number) => tx.orm.public.ProductImageAttributeValue.create({ productImageId, attributeValueId });
export const clearValues = async (tx: any, productImageId: number) => { while (await tx.orm.public.ProductImageAttributeValue.where({ productImageId }).select("productImageId").delete()) {} };
export const remove = (tx: any, id: number) => tx.orm.public.ProductImage.where({ id }).delete();
export const storageKeys = (productId: number) => db.orm.public.ProductImage.select("storageKey").where({ productId }).all();
