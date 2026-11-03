import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import type { CreateLandingPageInput, UpdateLandingPageInput, LandingPageQuery } from "../landing-page.types.js";

const toInstant = (val: unknown): Temporal.Instant | null | undefined => {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (val instanceof Temporal.Instant) return val;
  if (val instanceof Date) return Temporal.Instant.fromEpochMilliseconds(val.getTime());
  if (typeof val === "string" || typeof val === "number") {
    const ms = new Date(val).getTime();
    if (!isNaN(ms)) return Temporal.Instant.fromEpochMilliseconds(ms);
  }
  return null;
};

const landingPageFields = [
  "id",
  "title",
  "slug",
  "productId",
  "badgeText",
  "headline",
  "subHeadline",
  "videoUrl",
  "countdownTarget",
  "features",
  "gallery",
  "faqs",
  "customContent",
  "isPublished",
  "viewsCount",
  "createdAt",
  "updatedAt",
] as const;

export const findAll = async (params: LandingPageQuery) => {
  const { page = 1, limit = 20, search, productId, isPublished } = params;
  let q: any = db.orm.public.LandingPage.select(...landingPageFields)
    .include("product", (p: any) =>
      p
        .select("id", "name", "slug", "status", "isFreeShipping", "isCodAvailable", "requiresAdvancePayment", "advancePaymentAmount")
        .include("images", (img: any) => img.select("id", "imageUrl", "isPrimary", "sortOrder"))
        .include("variants", (v: any) => v.select("id", "sku", "price", "compareAtPrice", "isActive"))
    );

  if (productId) {
    q = q.where({ productId });
  }

  if (isPublished !== undefined) {
    q = q.where({ isPublished });
  }

  if (search) {
    const s = search.toLowerCase();
    q = q.where((lp: any) => lp.title.ilike(`%${s}%`));
  }

  const [{ total }, data] = await Promise.all([
    q.aggregate((a: any) => ({ total: a.count() })),
    q
      .orderBy((lp: any) => lp.createdAt.desc())
      .offset((page - 1) * limit)
      .limit(limit)
      .all(),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const findById = async (id: number) => {
  return db.orm.public.LandingPage.select(...landingPageFields)
    .include("product", (p: any) =>
      p
        .select("id", "name", "slug", "status", "description", "shortDescription", "isFreeShipping", "isCodAvailable", "requiresAdvancePayment", "advancePaymentAmount")
        .include("brand", (b: any) => b.select("id", "name", "slug"))
        .include("sizeChart", (sc: any) => sc.select("id", "name", "unit", "columns", "rows", "tips"))
        .include("images", (img: any) => img.select("id", "imageUrl", "isPrimary", "sortOrder"))
    )
    .first({ id });
};

export const findBySlug = async (slug: string) => {
  return db.orm.public.LandingPage.select(...landingPageFields).first({ slug });
};

export const findPublicBySlug = async (slug: string) => {
  return db.orm.public.LandingPage.select(...landingPageFields)
    .include("product", (p: any) =>
      p
        .select("id", "name", "slug", "status", "description", "shortDescription", "specifications", "isFreeShipping", "isCodAvailable", "requiresAdvancePayment", "advancePaymentAmount")
        .include("brand", (b: any) => b.select("id", "name", "slug"))
        .include("sizeChart", (sc: any) => sc.select("id", "name", "unit", "columns", "rows", "tips"))
    )
    .where({ slug, isPublished: true })
    .first();
};

export const create = async (data: CreateLandingPageInput & { slug: string }) => {
  return db.orm.public.LandingPage.create({
    title: data.title,
    slug: data.slug,
    productId: data.productId,
    badgeText: data.badgeText ?? null,
    headline: data.headline ?? null,
    subHeadline: data.subHeadline ?? null,
    videoUrl: data.videoUrl ?? null,
    countdownTarget: toInstant(data.countdownTarget) ?? null,
    features: (data.features ?? []) as any,
    gallery: (data.gallery ?? []) as any,
    faqs: (data.faqs ?? []) as any,
    customContent: data.customContent ?? null,
    isPublished: data.isPublished ?? true,
    viewsCount: 0,
  });
};

export const update = async (id: number, data: UpdateLandingPageInput & { slug?: string }) => {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.productId !== undefined) updateData.productId = data.productId;
  if (data.badgeText !== undefined) updateData.badgeText = data.badgeText;
  if (data.headline !== undefined) updateData.headline = data.headline;
  if (data.subHeadline !== undefined) updateData.subHeadline = data.subHeadline;
  if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
  if (data.countdownTarget !== undefined) {
    updateData.countdownTarget = toInstant(data.countdownTarget) ?? null;
  }
  if (data.features !== undefined) updateData.features = data.features as any;
  if (data.gallery !== undefined) updateData.gallery = data.gallery as any;
  if (data.faqs !== undefined) updateData.faqs = data.faqs as any;
  if (data.customContent !== undefined) updateData.customContent = data.customContent;
  if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

  return db.orm.public.LandingPage.where({ id }).update(updateData);
};

export const remove = async (id: number) => {
  return db.orm.public.LandingPage.where({ id }).delete();
};

export const incrementViews = async (id: number) => {
  try {
    const item = await db.orm.public.LandingPage.select("id", "viewsCount").first({ id });
    if (item) {
      await db.orm.public.LandingPage.where({ id }).update({
        viewsCount: (item.viewsCount || 0) + 1,
      });
    }
  } catch {
    // Non-blocking view counter
  }
};
