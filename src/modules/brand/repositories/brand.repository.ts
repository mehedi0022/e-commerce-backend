import { db } from "../../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  BrandListQuery,
  CreateBrandInput,
  UpdateBrandInput,
} from "../brand.types.js";
import { or } from "@prisma/orm-postgres/orm-client";

const select = [
  "id",
  "name",
  "slug",
  "logo",
  "description",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt",
] as const;

export const findById = (id: number) =>
  db.orm.public.Brand.select(...select).first({ id });

export const findByNameOrSlug = (name: string, slug: string) =>
  db.orm.public.Brand.select("id")
    .where((b) => or(b.name.eq(name), b.slug.eq(slug)))
    .first();

export const findBySlug = (slug: string) =>
  db.orm.public.Brand.select("id").first({ slug });

export const findAll = async ({
  page,
  limit,
  status,
  search,
  sortBy,
  sortOrder,
}: BrandListQuery) => {
  let q = db.orm.public.Brand.select(...select);
  if (status) q = q.where({ isActive: status === "ACTIVE" });
  if (search)
    q = q.where((b) =>
      or(b.name.ilike(`%${search}%`), b.slug.ilike(`%${search}%`)),
    );
  const ordered =
    sortBy === "name"
      ? q.orderBy((b) => (sortOrder === "asc" ? b.name.asc() : b.name.desc()))
      : sortBy === "id"
        ? q.orderBy((b) => (sortOrder === "asc" ? b.id.asc() : b.id.desc()))
        : sortBy === "createdAt"
          ? q.orderBy((b) =>
              sortOrder === "asc" ? b.createdAt.asc() : b.createdAt.desc(),
            )
          : q.orderBy([
              (b) =>
                sortOrder === "asc" ? b.sortOrder.asc() : b.sortOrder.desc(),
              (b) => b.id.asc(),
            ]);
  const [{ total }, brands] = await Promise.all([
    q.aggregate((a) => ({ total: a.count() })),
    ordered.offset(pageOffset(page, limit)).limit(limit).all(),
  ]);
  return { brands, meta: paginationMeta(page, limit, total) };
};

export const create = (data: CreateBrandInput & { slug: string }) =>
  db.orm.public.Brand.select(...select).create({
    ...data,
    logo: data.logo ?? null,
    description: data.description ?? null,
  });

export const update = (
  id: number,
  data: UpdateBrandInput & { slug?: string },
) =>
  db.orm.public.Brand.where({ id })
    .select(...select)
    .update(data);

export const remove = (id: number) =>
  db.orm.public.Brand.where({ id }).delete();

export const setStatus = (id: number, isActive: boolean) =>
  db.orm.public.Brand.where({ id })
    .select(...select)
    .update({ isActive });

export const setOrder = (id: number, sortOrder: number) =>
  db.orm.public.Brand.where({ id })
    .select(...select)
    .update({ sortOrder });
