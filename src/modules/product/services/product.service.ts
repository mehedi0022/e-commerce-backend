import * as repo from "../repositories/product.repository.js";
import { ConflictError, NotFoundError } from "../../../errors/AppError.js";
import { uniqueSlug } from "../../../utils/slug.util.js";
import { db } from "../../../prisma/db.js";
import type {
  CategoryAssignment,
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from "../product.types.js";
import { uploadService } from "../../upload/upload.module.js";
import * as imageRepository from "../repositories/product-image.repository.js";
import * as variantRepository from "../repositories/product-variant.repository.js";

const validateRelations = async (
  brandId: number | null | undefined,
  categories: CategoryAssignment[] | undefined,
  existingCategories: CategoryAssignment[] = [],
) => {
  if (brandId !== undefined && brandId !== null) {
    const brand = await repo.findBrand(brandId);
    if (!brand) throw new NotFoundError("Brand not found");
    if (!brand.isActive)
      throw new ConflictError("Inactive brand cannot be assigned");
  }
  if (categories)
    for (const item of categories) {
      const category = await repo.findCategory(item.categoryId);
      if (!category)
        throw new NotFoundError(`Category ${item.categoryId} not found`);
      if (!category.isActive) throw new ConflictError("Inactive category cannot be assigned");
      const unchanged = existingCategories.some(previous => previous.categoryId === item.categoryId && previous.isPrimary === item.isPrimary);
      if (item.isPrimary && !unchanged && await repo.findCategoryChild(item.categoryId))
        throw new ConflictError("Choose a leaf category (one without subcategories) as the primary category.");
    }
};

const sync = async (
  tx: any,
  productId: number,
  categories: CategoryAssignment[] | undefined,
) => {
  if (!categories) return;
  await repo.clearCategories(tx, productId);
  for (const item of categories) await repo.addCategory(tx, productId, item);
};

export const list = (q: ProductListQuery) => repo.findAll(q);

export const get = async (id: number) => {
  const product = await repo.findById(id);
  if (!product) throw new NotFoundError("Product not found");
  return product;
};

export const publicList = (q: ProductListQuery) => repo.findAll({ ...q, status: "ACTIVE" }, true);

export const publicGetBySlug = async (slug: string) => {
  const product = await repo.findPublicBySlug(slug);
  if (!product) throw new NotFoundError("Product not found");
  const [variants, images] = await Promise.all([variantRepository.list(product.id), imageRepository.list(product.id)]);
  return { ...product, variants: variants.filter((variant: any) => variant.isActive).map((variant: any) => ({
    id: variant.id, productId: variant.productId, sku: variant.sku,
    price: variant.price, compareAtPrice: variant.compareAtPrice,
    isActive: variant.isActive, sortOrder: variant.sortOrder,
    attributeValues: variant.attributeValues,
  })), images };
};

export const create = async (data: CreateProductInput) => {
  await validateRelations(data.brandId, data.categories);
  const slug = await uniqueSlug(data.name, async (s) =>
    Boolean(await repo.findBySlug(s)),
  );
  const created = await db.transaction(async (tx) => {
    const product = await repo.create(tx, { ...data, slug });
    await sync(tx, product.id, data.categories);
    return product;
  });
  return get(created.id);
};

export const update = async (id: number, data: UpdateProductInput) => {
  const current = await get(id);
  await validateRelations(data.brandId, data.categories, (current as any).categories ?? []);
  const slug = data.name
    ? await uniqueSlug(data.name, async (s) => {
        const x = await repo.findBySlug(s);
        return Boolean(x && x.id !== id);
      })
    : undefined;
  await db.transaction(async (tx) => {
    const { categories, ...fields } = data;
    if (Object.keys(fields).length || slug) {
      await repo.update(tx, id, { ...fields, ...(slug ? { slug } : {}) });
    }
    await sync(tx, id, categories);
  });
  return get(id);
};

export const remove = async (id: number) => {
  await get(id);
  const images = await imageRepository.storageKeys(id);
  await db.transaction((tx) => repo.remove(tx, id));
  for (const image of images) if (image.storageKey) await uploadService.delete(image.storageKey).catch(() => undefined);
};

export const status = async (
  id: number,
  status: NonNullable<UpdateProductInput["status"]>,
) => update(id, { status });
