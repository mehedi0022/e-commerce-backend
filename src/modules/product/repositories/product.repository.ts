import { db } from "../../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  CategoryAssignment,
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from "../product.types.js";
import { or } from "@prisma/orm-postgres/orm-client";

const productFields = [
  "id",
  "name",
  "slug",
  "shortDescription",
  "description",
  "brandId",
  "status",
  "isFeatured",
  "createdAt",
  "updatedAt",
] as const;

const categoryFields = [
  "productId",
  "categoryId",
  "isPrimary",
  "sortOrder",
  "createdAt",
] as const;

const withRelations = (q: any) =>
  q
    .include("brand", (b: any) => b.select("id", "name", "slug"))
    .include("categories", (pc: any) =>
      pc
        .select(...categoryFields)
        .include("category", (c: any) => c.select("id", "name", "slug")),
    );

export const findById = (id: number) =>
  withRelations(db.orm.public.Product.select(...productFields)).first({ id });

export const findBySlug = (slug: string) =>
  db.orm.public.Product.select("id").first({ slug });

export const findBrand = (id: number) =>
  db.orm.public.Brand.select("id", "isActive").first({ id });

export const findCategory = (id: number) =>
  db.orm.public.Category.select("id", "isActive").first({ id });

export const findAll = async ({
  page,
  limit,
  search,
  status,
  brandId,
  categoryId,
  isFeatured,
  sortBy,
  sortOrder,
}: ProductListQuery) => {
  let q = withRelations(db.orm.public.Product.select(...productFields));
  if (search)
    q = q.where((p: any) =>
      or(p.name.ilike(`%${search}%`), p.slug.ilike(`%${search}%`)),
    );
  if (status) q = q.where({ status });
  if (brandId) q = q.where({ brandId });
  if (isFeatured !== undefined) q = q.where({ isFeatured });
  if (categoryId)
    q = q.where((p: any) =>
      p.categories.some((c: any) => c.categoryId.eq(categoryId)),
    );
  const ordered =
    sortBy === "name"
      ? q.orderBy((p: any) =>
          sortOrder === "asc" ? p.name.asc() : p.name.desc(),
        )
      : sortBy === "id"
        ? q.orderBy((p: any) =>
            sortOrder === "asc" ? p.id.asc() : p.id.desc(),
          )
        : q.orderBy((p: any) =>
            sortOrder === "asc" ? p.createdAt.asc() : p.createdAt.desc(),
          );
  const [{ total }, products] = await Promise.all([
    q.aggregate((a: any) => ({ total: a.count() })),
    ordered.offset(pageOffset(page, limit)).limit(limit).all(),
  ]);
  return { products, meta: paginationMeta(page, limit, total) };
};

export const create = (tx: any, data: CreateProductInput & { slug: string }) =>
  tx.orm.public.Product.select(...productFields).create({
    name: data.name,
    slug: data.slug,
    shortDescription: data.shortDescription ?? null,
    description: data.description ?? null,
    brandId: data.brandId ?? null,
    status: data.status ?? "DRAFT",
    isFeatured: data.isFeatured ?? false,
  });

export const update = (
  tx: any,
  id: number,
  data: UpdateProductInput & { slug?: string },
) =>
  tx.orm.public.Product.where({ id })
    .select(...productFields)
    .update(data);

export const addCategory = (
  tx: any,
  productId: number,
  item: CategoryAssignment,
) => tx.orm.public.ProductCategory.create({ productId, ...item });

export const clearCategories = async (tx: any, productId: number) => {
  while (
    await tx.orm.public.ProductCategory.where({ productId })
      .select("productId")
      .delete()
  ) {}
};

export const remove = (tx: any, id: number) =>
  tx.orm.public.Product.where({ id }).delete();
