import { uniqueSlug } from "../../../utils/slug.util.js";
import { NotFoundError, ConflictError } from "../../../errors/AppError.js";
import * as repo from "../repositories/landing-page.repository.js";
import * as variantRepo from "../../product/repositories/product-variant.repository.js";
import * as imageRepo from "../../product/repositories/product-image.repository.js";
import type { CreateLandingPageInput, UpdateLandingPageInput, LandingPageQuery } from "../landing-page.types.js";

export const list = async (query: LandingPageQuery) => {
  return repo.findAll(query);
};

export const getById = async (id: number) => {
  const landingPage = await repo.findById(id);
  if (!landingPage) throw new NotFoundError("Landing page not found");
  return landingPage;
};

export const getPublicBySlug = async (slug: string) => {
  const landingPage = await repo.findPublicBySlug(slug);
  if (!landingPage) throw new NotFoundError("Landing page not found or is currently unpublished");

  // Increment view counter asynchronously
  void repo.incrementViews(landingPage.id);

  if (landingPage.product) {
    const prod = landingPage.product as any;
    const [variants, images] = await Promise.all([
      variantRepo.list(prod.id),
      imageRepo.list(prod.id),
    ]);

    landingPage.product = {
      ...prod,
      variants: variants.filter((v: any) => v.isActive).map((v: any) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
        attributeValues: v.attributeValues,
      })),
      images,
    };
  }

  return landingPage;
};

export const create = async (data: CreateLandingPageInput) => {
  const slug = data.slug
    ? await uniqueSlug(data.slug, async (s) => Boolean(await repo.findBySlug(s)))
    : await uniqueSlug(data.title, async (s) => Boolean(await repo.findBySlug(s)));

  return repo.create({ ...data, slug });
};

export const update = async (id: number, data: UpdateLandingPageInput) => {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Landing page not found");

  let slug = data.slug;
  if (slug && slug !== existing.slug) {
    const clash = await repo.findBySlug(slug);
    if (clash && clash.id !== id) {
      throw new ConflictError("A landing page with this custom URL slug already exists.");
    }
  }

  await repo.update(id, { ...data, ...(slug ? { slug } : {}) });
  return repo.findById(id);
};

export const remove = async (id: number) => {
  const existing = await repo.findById(id);
  if (!existing) throw new NotFoundError("Landing page not found");
  await repo.remove(id);
  return null;
};
