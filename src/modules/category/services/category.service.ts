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

const ensureParent = async (
  parentId: number | null | undefined,
  id?: number,
) => {
  if (parentId == null) return;
  if (id === parentId)
    throw new ValidationError("A category cannot be its own parent");
  if (!(await repo.findById(parentId)))
    throw new NotFoundError("Parent category not found");
  let cursor = parentId;
  while (cursor) {
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
  await ensureParent(data.parentId);
  await ensureUnique(data);
  const slug = await uniqueSlug(data.name, async (value) =>
    Boolean(await repo.findBySlug(value)),
  );
  return repo.create({ ...data, slug });
};

export const update = async (id: number, data: UpdateCategoryInput) => {
  await get(id);
  await ensureParent(data.parentId, id);
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
  await get(id);
  await repo.remove(id);
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
  const map = new Map<number, any>();
  const roots: any[] = [];
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  map.forEach((r) =>
    r.parentId && map.get(r.parentId)
      ? map.get(r.parentId).children.push(r)
      : roots.push(r),
  );
  return roots;
};
