import { db } from "../../../prisma/db.js";
import type { CategoryAttributeAssignment } from "../validations/category-attribute.validation.js";

const fields = [
  "id",
  "categoryId",
  "attributeId",
  "isRequired",
  "sortOrder",
  "createdAt",
  "updatedAt",
] as const;

export const findCategory = (id: number) =>
  db.orm.public.Category.select("id", "isActive").first({ id });
export const findChild = (parentId: number) => db.orm.public.Category.select("id").first({ parentId });
export const activeValues = (attributeId: number) => db.orm.public.AttributeValue.select("id").where({ attributeId, isActive: true }).all();
export const findAttribute = (id: number) =>
  db.orm.public.Attribute.select("id", "name", "slug", "isActive").first({
    id,
  });
export const list = (categoryId: number) =>
  db.orm.public.CategoryAttribute.select(...fields)
    .where({ categoryId })
    .orderBy([(x) => x.sortOrder.asc(), (x) => x.id.asc()])
    .include("attribute", a => a.select("id", "name", "isActive").include("values", v => v.select("id", "value", "isActive", "sortOrder").orderBy(x => x.sortOrder.asc())))
    .all();
export const primaryVariants = async (categoryId: number) => {
  const products = await db.orm.public.ProductCategory.select("productId").where({ categoryId, isPrimary: true }).all();
  if (!products.length) return [];
  return db.orm.public.ProductVariant.select("id", "sku").where(v => v.productId.in(products.map(p => p.productId)))
    .include("attributeValues", mappings => mappings.select("attributeValueId").include("attributeValue", value => value.select("attributeId"))).all();
};
export const replace = async (
  categoryId: number,
  assignments: CategoryAttributeAssignment[],
) => {
  return db.transaction(async (tx) => {
    while (
      await tx.orm.public.CategoryAttribute.where({ categoryId })
        .select("id")
        .delete()
    ) {
      // Prisma 8 ORM mutations one matching row at a time.
    }
    const result = [];
    for (const assignment of assignments) {
      result.push(
        await tx.orm.public.CategoryAttribute.select(...fields).create({
          categoryId,
          ...assignment,
        }),
      );
    }
    return result;
  });
};
