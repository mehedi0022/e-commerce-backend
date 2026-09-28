import { db } from "../../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  AttributeListQuery,
  CreateAttributeInput,
  CreateValueInput,
  UpdateAttributeInput,
  UpdateValueInput,
} from "../attribute.types.js";
import { or } from "@prisma/orm-postgres/orm-client";
const attributeFields = [
  "id",
  "name",
  "slug",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt",
] as const;
const valueFields = [
  "id",
  "attributeId",
  "value",
  "slug",
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt",
] as const;
export const findAttribute = (id: number) =>
  db.orm.public.Attribute.select(...attributeFields).first({ id });
export const findAttributeByName = (name: string) =>
  db.orm.public.Attribute.select("id").first({ name });
export const findAttributeBySlug = (slug: string) =>
  db.orm.public.Attribute.select("id").first({ slug });
export const listAttributes = async ({
  page,
  limit,
  search,
  status,
  sortOrder,
}: AttributeListQuery) => {
  let q = db.orm.public.Attribute.select(...attributeFields);
  if (status) q = q.where({ isActive: status === "ACTIVE" });
  if (search)
    q = q.where((a) =>
      or(a.name.ilike(`%${search}%`), a.slug.ilike(`%${search}%`)),
    );
  const ordered = q.orderBy([
    (a) => (sortOrder === "asc" ? a.sortOrder.asc() : a.sortOrder.desc()),
    (a) => a.id.asc(),
  ]);
  const [{ total }, attributes] = await Promise.all([
    q.aggregate((a) => ({ total: a.count() })),
    ordered.offset(pageOffset(page, limit)).limit(limit).all(),
  ]);
  return { attributes, meta: paginationMeta(page, limit, total) };
};
export const createAttribute = (
  data: CreateAttributeInput & { slug: string },
) => db.orm.public.Attribute.select(...attributeFields).create(data);
export const updateAttribute = (
  id: number,
  data: UpdateAttributeInput & { slug?: string },
) =>
  db.orm.public.Attribute.where({ id })
    .select(...attributeFields)
    .update(data);
export const deleteAttribute = (id: number) =>
  db.orm.public.Attribute.where({ id }).delete();
export const updateAttributeStatus = (id: number, isActive: boolean) =>
  db.orm.public.Attribute.where({ id })
    .select(...attributeFields)
    .update({ isActive });
export const listValues = (attributeId: number) =>
  db.orm.public.AttributeValue.select(...valueFields)
    .where({ attributeId })
    .orderBy([(v) => v.sortOrder.asc(), (v) => v.id.asc()])
    .all();
export const findValue = (id: number, attributeId?: number) =>
  db.orm.public.AttributeValue.select(...valueFields).first(
    attributeId === undefined ? { id } : { id, attributeId },
  );
export const findValueBySlug = (attributeId: number, slug: string) =>
  db.orm.public.AttributeValue.select("id").first({ attributeId, slug });
export const findValueByValue = (attributeId: number, value: string) =>
  db.orm.public.AttributeValue.select("id").first({ attributeId, value });
export const createValue = (
  data: CreateValueInput & { attributeId: number; slug: string },
) => db.orm.public.AttributeValue.select(...valueFields).create(data);
export const updateValue = (
  id: number,
  data: UpdateValueInput & { slug?: string },
) =>
  db.orm.public.AttributeValue.where({ id })
    .select(...valueFields)
    .update(data);
export const deleteValue = (id: number) =>
  db.orm.public.AttributeValue.where({ id }).delete();
