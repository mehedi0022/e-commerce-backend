import * as repo from "../repositories/brand.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../errors/AppError.js";
import { uploadService } from "../../upload/upload.module.js";
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
  if (await repo.findProduct(id)) throw new ConflictError("This brand is used by products. Reassign the products or deactivate the brand instead.");
  await repo.remove(id);
};

export const uploadLogo = async (id: number, file: Express.Multer.File | undefined) => {
  await get(id);
  if (!file) throw new ValidationError("Logo image is required");
  const stored = await uploadService.upload(file, "brands");
  try { return await repo.update(id, { logo: stored.url }); }
  catch (error) { await uploadService.delete(stored.key).catch(() => undefined); throw error; }
};

export const status = async (id: number, isActive: boolean) => {
  await get(id);
  return repo.setStatus(id, isActive);
};

export const reorder = async (id: number, { sortOrder }: ReorderBrandInput) => {
  await get(id);
  return repo.setOrder(id, sortOrder);
};
