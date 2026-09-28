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

const validateRelations = async (
  brandId: number | null | undefined,
  categories: CategoryAssignment[] | undefined,
) => {
  if (brandId !== undefined && brandId !== null) {
    const brand = await repo.findBrand(brandId);
    if (!brand) throw new NotFoundError("Brand not found");
    if (!brand.isActive)
      throw new ConflictError("Inactive brand cannot be assigned");
  }
  if (categories)
    for (const item of categories) {
      if (!(await repo.findCategory(item.categoryId)))
        throw new NotFoundError(`Category ${item.categoryId} not found`);
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

export const create = async (data: CreateProductInput) => {
  await validateRelations(data.brandId, data.categories);
  const slug = await uniqueSlug(data.name, async (s) =>
    Boolean(await repo.findBySlug(s)),
  );
  return db.transaction(async (tx) => {
    const product = await repo.create(tx, { ...data, slug });
    await sync(tx, product.id, data.categories);
    return get(product.id);
  });
};

export const update = async (id: number, data: UpdateProductInput) => {
  await get(id);
  await validateRelations(data.brandId, data.categories);
  const slug = data.name
    ? await uniqueSlug(data.name, async (s) => {
        const x = await repo.findBySlug(s);
        return Boolean(x && x.id !== id);
      })
    : undefined;
  return db.transaction(async (tx) => {
    await repo.update(tx, id, { ...data, ...(slug ? { slug } : {}) });
    await sync(tx, id, data.categories);
    return get(id);
  });
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
