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
  db.orm.public.Category.select("id").first({ id });
export const findAttribute = (id: number) =>
  db.orm.public.Attribute.select("id", "name", "slug", "isActive").first({
    id,
  });
export const list = (categoryId: number) =>
  db.orm.public.CategoryAttribute.select(...fields)
    .where({ categoryId })
    .orderBy([(x) => x.sortOrder.asc(), (x) => x.id.asc()])
    .all();
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
