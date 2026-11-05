import * as repo from "../repositories/category.repository.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../errors/AppError.js";
import type {
  CategoryListQuery,
  CreateCategoryInput,
  ReorderCategoryInput,
  UpdateCategoryInput,
} from "../category.types.js";
import { uniqueSlug } from "../../../utils/slug.util.js";
import { uploadService } from "../../upload/upload.module.js";
import { categoryMetadata } from "../category-tree.js";

const ensureParent = async (
  parentId: number | null | undefined,
  id?: number,
  allowMigration?: boolean,
) => {
  if (parentId == null) return;
  if (id === parentId)
    throw new ValidationError("A category cannot be its own parent");
  if (!(await repo.findById(parentId)))
    throw new NotFoundError("Parent category not found");
  if (!allowMigration && (await repo.findPrimaryProduct(parentId))) {
    const count = await repo.countProducts(parentId);
    throw new ConflictError(
      `Category has ${count} existing product(s). Move them to a subcategory or enable automatic migration.`,
    );
  }
  let cursor = parentId;
  const visited = new Set<number>();
  while (cursor) {
    if (visited.has(cursor)) throw new ValidationError("The selected parent has a circular category hierarchy. Fix its parent links first.");
    visited.add(cursor);
    const parent = await repo.findById(cursor);
    if (!parent?.parentId) break;
    if (parent.parentId === id)
      throw new ValidationError(
        "A category cannot be moved below its own descendant",
      );
    cursor = parent.parentId;
  }
};

const ensureUnique = async (
  data: { name?: string; slug?: string },
  id?: number,
) => {
  if (data.name || data.slug) {
    const existing = await repo.findByNameOrSlug(
      data.name ?? "",
      data.slug ?? "",
      id,
    );
    if (existing && existing.id !== id)
      throw new ConflictError("Category name or slug already exists");
  }
};

export const list = (q: CategoryListQuery) => repo.findAll(q);

export const get = async (id: number) => {
  const v = await repo.findById(id);
  if (!v) throw new NotFoundError("Category not found");
  return v;
};

export const create = async (data: CreateCategoryInput) => {
  const { migrateParentProducts, ...categoryData } = data;
  await ensureParent(data.parentId, undefined, Boolean(migrateParentProducts));
  await ensureUnique(categoryData);
  const slug = await uniqueSlug(data.name, async (value) =>
    Boolean(await repo.findBySlug(value)),
  );
  const created = await repo.create({ ...categoryData, slug });
  if (migrateParentProducts && data.parentId) {
    await repo.migrateProducts(data.parentId, created.id);
  }
  return created;
};

export const migrateCategoryProducts = async (
  fromCategoryId: number,
  toCategoryId: number,
) => {
  if (fromCategoryId === toCategoryId) {
    throw new ValidationError("Source and target categories must be different");
  }
  const from = await repo.findById(fromCategoryId);
  if (!from) throw new NotFoundError("Source category not found");
  const to = await repo.findById(toCategoryId);
  if (!to) throw new NotFoundError("Target category not found");

  const migratedCount = await repo.migrateProducts(fromCategoryId, toCategoryId);
  return { migratedCount };
};

export const update = async (id: number, data: UpdateCategoryInput) => {
  const current = await get(id);
  if (data.parentId !== current.parentId) await ensureParent(data.parentId, id);
  await ensureUnique(data, id);
  const slug = data.name
    ? await uniqueSlug(data.name, async (value) => {
        const found = await repo.findBySlug(value);
        return Boolean(found && found.id !== id);
      })
    : undefined;
  const v = await repo.update(id, { ...data, ...(slug ? { slug } : {}) });
  if (!v) throw new NotFoundError("Category not found");
  return v;
};

export const remove = async (id: number) => {
  const category: any = await get(id);
  if (await repo.findChild(id)) throw new ConflictError("Move or delete the subcategories before deleting this category.");
  if (await repo.findProductAssignment(id)) throw new ConflictError("This category is used by products. Move the products or deactivate the category instead.");
  await repo.remove(id);
  if (category.image) {
    const key = category.image.startsWith("/uploads/")
      ? category.image.slice("/uploads/".length)
      : category.image.split("/").slice(-2).join("/").split("?")[0];
    await uploadService.delete(key).catch(() => undefined);
  }
};

export const status = async (id: number, active: boolean) => {
  await get(id);
  return repo.setStatus(id, active);
};

export const reorder = async (
  id: number,
  { sortOrder }: ReorderCategoryInput,
) => {
  await get(id);
  return repo.setOrder(id, sortOrder);
};

export const tree = async () => {
  const rows = await repo.allForTree();
  const metadata = categoryMetadata(rows);
  const map = new Map<number, any>();
  const roots: any[] = [];
  rows.forEach((r) => map.set(r.id, { ...r, ...metadata.get(r.id), children: [] }));
  map.forEach((r) =>
    r.parentId && map.get(r.parentId)
      ? map.get(r.parentId).children.push(r)
      : roots.push(r),
  );
  return roots;
};

export const uploadImage = async (id: number, file: Express.Multer.File | undefined) => {
  await get(id);
  if (!file) throw new ValidationError("Image file is required");
  const stored = await uploadService.upload(file, "categories");
  try {
    return await repo.update(id, { image: stored.url });
  } catch (error) {
    await uploadService.delete(stored.key).catch(() => undefined);
    throw error;
  }
};
