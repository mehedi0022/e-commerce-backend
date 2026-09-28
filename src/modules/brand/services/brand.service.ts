import * as repo from "../repositories/brand.repository.js";
import { ConflictError, NotFoundError } from "../../../errors/AppError.js";
import type {
  BrandListQuery,
  CreateBrandInput,
  ReorderBrandInput,
  UpdateBrandInput,
} from "../brand.types.js";
import { uniqueSlug } from "../../../utils/slug.util.js";

const unique = async (data: { name?: string; slug?: string }, id?: number) => {
  if (!data.name && !data.slug) return;
  const found = await repo.findByNameOrSlug(data.name ?? "", data.slug ?? "");
  if (found && found.id !== id)
    throw new ConflictError("Brand name or slug already exists");
};

export const list = (q: BrandListQuery) => repo.findAll(q);

export const get = async (id: number) => {
  const value = await repo.findById(id);
  if (!value) throw new NotFoundError("Brand not found");
  return value;
};

export const create = async (data: CreateBrandInput) => {
  await unique(data);
  const slug = await uniqueSlug(data.name, async (value) =>
    Boolean(await repo.findBySlug(value)),
  );
  return repo.create({ ...data, slug });
};

export const update = async (id: number, data: UpdateBrandInput) => {
  await get(id);
  await unique(data, id);
  const slug = data.name
    ? await uniqueSlug(data.name, async (value) => {
        const found = await repo.findBySlug(value);
        return Boolean(found && found.id !== id);
      })
    : undefined;
  const value = await repo.update(id, { ...data, ...(slug ? { slug } : {}) });
  if (!value) throw new NotFoundError("Brand not found");
  return value;
};

export const remove = async (id: number) => {
  await get(id);
  await repo.remove(id);
};

export const status = async (id: number, isActive: boolean) => {
  await get(id);
  return repo.setStatus(id, isActive);
};

export const reorder = async (id: number, { sortOrder }: ReorderBrandInput) => {
  await get(id);
  return repo.setOrder(id, sortOrder);
};
