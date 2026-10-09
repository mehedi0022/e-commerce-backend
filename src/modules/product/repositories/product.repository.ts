import { db } from "../../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  CategoryAssignment,
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from "../product.types.js";
import { or } from "@prisma/orm-postgres/orm-client";
import { hierarchy } from "../../category/repositories/category.repository.js";
import { descendantCategoryIds } from "../../category/category-tree.js";

const productFields = [
  "id",
  "name",
  "slug",
  "shortDescription",
  "description",
  "brandId",
  "status",
  "isFeatured",
  "isFreeShipping",
  "isCodAvailable",
  "requiresAdvancePayment",
  "advancePaymentAmount",
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
export const findCategoryChild = (parentId: number) =>
  db.orm.public.Category.select("id").first({ parentId });

export const findAll = async (
  {
    page,
    limit,
    search,
    status,
    brandId,
    brandIds,
    categoryId,
    categorySlug,
    isFeatured,
    minPrice,
    maxPrice,
    rating,
    inStock,
    sortBy,
    sortOrder,
  }: ProductListQuery,
  publicCards = false,
) => {
  const base = db.orm.public.Product.select(...productFields);
  let q = withRelations(
    publicCards
      ? base
          .include("variants", (v) =>
            v
              .select(
                "id",
                "productId",
                "sku",
                "price",
                "compareAtPrice",
                "isActive",
                "sortOrder",
              )
              .include("attributeValues", (av: any) =>
                av.include("attributeValue", (val: any) =>
                  val
                    .include("attribute", (a: any) => a.select("id", "name", "slug"))
                    .select("id", "value", "slug", "attributeId"),
                ),
              )
              .where({ isActive: true })
              .orderBy((v) => v.sortOrder.asc()),
          )
          .include("images", (i) =>
            i
              .select("id", "imageUrl", "altText", "isPrimary", "sortOrder")
              .orderBy((i) => i.sortOrder.asc()),
          )
          .include("reviews", (r) => r.select("id", "rating", "status"))
      : base,
  );

  if (search) {
    const s = search.trim();
    q = q.where((p: any) => or(p.name.ilike(`%${s}%`), p.slug.ilike(`%${s}%`)));
  }
  if (status) q = q.where({ status });
  if (brandId) q = q.where({ brandId });
  if (brandIds) {
    const ids = brandIds
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);
    if (ids.length) q = q.where((p: any) => p.brandId.in(ids));
  }
  if (isFeatured !== undefined) q = q.where({ isFeatured });

  const allCategoryIds = new Set<number>();
  const hier = await hierarchy();

  if (categoryId) {
    for (const id of descendantCategoryIds(hier, categoryId)) {
      allCategoryIds.add(id);
    }
  }

  if (categorySlug) {
    const slugs = categorySlug.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (slugs.length) {
      const cats = await db.orm.public.Category.where((c: any) => c.slug.in(slugs)).all();
      for (const cat of cats) {
        for (const id of descendantCategoryIds(hier, cat.id)) {
          allCategoryIds.add(id);
        }
      }
    }
  }

  if (allCategoryIds.size > 0) {
    const ids = Array.from(allCategoryIds);
    q = q.where((p: any) =>
      p.categories.some((c: any) => c.categoryId.in(ids)),
    );
  }

  if (minPrice !== undefined) {
    q = q.where((p: any) => p.variants.some((v: any) => v.price.gte(minPrice)));
  }
  if (maxPrice !== undefined) {
    q = q.where((p: any) => p.variants.some((v: any) => v.price.lte(maxPrice)));
  }

  if (inStock) {
    const inStockInv = await db.orm.public.Inventory.where((i: any) =>
      i.quantity.gt(0),
    )
      .select("variantId")
      .all();
    const inStockVariantIds = inStockInv.map((x: any) => x.variantId);
    q = q.where((p: any) =>
      p.variants.some((v: any) => v.id.in(inStockVariantIds)),
    );
  }

  if (rating !== undefined) {
    const reviews = await db.orm.public.ProductReview.where((r: any) =>
      r.rating.gte(rating),
    )
      .select("productId", "status")
      .all();
    const matchingProductIds = Array.from(
      new Set(
        reviews
          .filter((r: any) => r.status === "APPROVED")
          .map((r: any) => r.productId),
      ),
    );
    q = q.where((p: any) => p.id.in(matchingProductIds));
  }

  let ordered = q;
  if (sortBy === "name") {
    ordered = q.orderBy((p: any) =>
      sortOrder === "asc" ? p.name.asc() : p.name.desc(),
    );
  } else if (sortBy === "id") {
    ordered = q.orderBy((p: any) =>
      sortOrder === "asc" ? p.id.asc() : p.id.desc(),
    );
  } else if (sortBy === "isFeatured") {
    ordered = q
      .orderBy((p: any) => p.isFeatured.desc())
      .orderBy((p: any) => p.createdAt.desc());
  } else {
    ordered = q.orderBy((p: any) =>
      sortOrder === "asc" ? p.createdAt.asc() : p.createdAt.desc(),
    );
  }

  const [{ total }, rawProducts] = await Promise.all([
    q.aggregate((a: any) => ({ total: a.count() })),
    ordered.offset(pageOffset(page, limit)).limit(limit).all(),
  ]);

  let products = rawProducts;
  if (publicCards) {
    products = rawProducts.map((p: any) => {
      const approvedReviews = (p.reviews || []).filter(
        (r: any) => r.status === "APPROVED",
      );
      const reviewCount = approvedReviews.length;
      const averageRating = reviewCount
        ? Number(
            (
              approvedReviews.reduce(
                (sum: number, r: any) => sum + r.rating,
                0,
              ) / reviewCount
            ).toFixed(1),
          )
        : 0;
      return {
        ...p,
        averageRating,
        reviewCount,
      };
    });

    if (sortBy === "price") {
      products.sort((a: any, b: any) => {
        const minA = Math.min(
          ...(a.variants?.map((v: any) => Number(v.price)) || [0]),
        );
        const minB = Math.min(
          ...(b.variants?.map((v: any) => Number(v.price)) || [0]),
        );
        return sortOrder === "asc" ? minA - minB : minB - minA;
      });
    } else if (sortBy === "rating") {
      products.sort((a: any, b: any) => {
        return sortOrder === "asc"
          ? a.averageRating - b.averageRating
          : b.averageRating - a.averageRating;
      });
    }
  }

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

export const findPublicBySlug = (slug: string) =>
  withRelations(db.orm.public.Product.select(...productFields))
    .where({ slug, status: "ACTIVE" })
    .first();
