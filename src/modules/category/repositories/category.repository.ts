import { db } from "../../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  CategoryListQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../category.types.js";
import { or } from "@prisma/orm-postgres/orm-client";

const select = [
  "id",
  "name",
  "slug",
  "description",
  "image",
  "parentId",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt",
] as const;

export const findById = (id: number) =>
  db.orm.public.Category.select(...select).first({ id });

export const findByNameOrSlug = (
  name: string,
  slug: string,
  excludeId?: number,
) => {
  let q = db.orm.public.Category.select("id").where((c) =>
    or(c.name.eq(name), c.slug.eq(slug)),
  );
  return q.first();
};

export const findBySlug = (slug: string) =>
  db.orm.public.Category.select("id").first({ slug });

export const findAll = async ({
  page,
  limit,
  parentId,
  status,
  search,
  sortBy,
  sortOrder,
}: CategoryListQuery) => {
  let q = db.orm.public.Category.select(...select);
  if (parentId !== undefined) q = q.where({ parentId });
  if (status) q = q.where({ isActive: status === "ACTIVE" });
  if (search)
    q = q.where((c) =>
      or(c.name.ilike(`%${search}%`), c.slug.ilike(`%${search}%`)),
    );
  const ordered =
    sortBy === "name"
      ? q.orderBy((c) => (sortOrder === "asc" ? c.name.asc() : c.name.desc()))
      : sortBy === "id"
        ? q.orderBy((c) => (sortOrder === "asc" ? c.id.asc() : c.id.desc()))
        : sortBy === "createdAt"
          ? q.orderBy((c) =>
              sortOrder === "asc" ? c.createdAt.asc() : c.createdAt.desc(),
            )
          : q.orderBy([
              (c) =>
                sortOrder === "asc" ? c.sortOrder.asc() : c.sortOrder.desc(),
              (c) => c.id.asc(),
            ]);
  const [{ total }, categories] = await Promise.all([
    q.aggregate((a) => ({ total: a.count() })),
    ordered.offset(pageOffset(page, limit)).limit(limit).all(),
  ]);
  return { categories, meta: paginationMeta(page, limit, total) };
};

export const create = (data: CreateCategoryInput & { slug: string }) =>
  db.orm.public.Category.select(...select).create({
    ...data,
    description: data.description ?? null,
    image: data.image ?? null,
    parentId: data.parentId ?? null,
  });

export const update = (
  id: number,
  data: UpdateCategoryInput & { slug?: string },
) =>
  db.orm.public.Category.where({ id })
    .select(...select)
    .update(data);

export const remove = (id: number) =>
  db.orm.public.Category.where({ id }).delete();

export const setStatus = (id: number, isActive: boolean) =>
  db.orm.public.Category.where({ id })
    .select(...select)
    .update({ isActive });

export const setOrder = (id: number, sortOrder: number) =>
  db.orm.public.Category.where({ id })
    .select(...select)
    .update({ sortOrder });

export const allForTree = () =>
  db.orm.public.Category.select(...select)
    .orderBy([(c) => c.sortOrder.asc(), (c) => c.name.asc()])
    .all();
