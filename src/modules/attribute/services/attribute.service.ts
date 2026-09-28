import * as repo from "../repositories/attribute.repository.js";
import { ConflictError, NotFoundError } from "../../../errors/AppError.js";
import { uniqueSlug } from "../../../utils/slug.util.js";
import type {
  AttributeListQuery,
  CreateAttributeInput,
  CreateValueInput,
  UpdateAttributeInput,
  UpdateValueInput,
} from "../attribute.types.js";
export const list = (q: AttributeListQuery) => repo.listAttributes(q);
export const get = async (id: number) => {
  const x = await repo.findAttribute(id);
  if (!x) throw new NotFoundError("Attribute not found");
  return x;
};
export const create = async (data: CreateAttributeInput) => {
  if (await repo.findAttributeByName(data.name))
    throw new ConflictError("Attribute name already exists");
  const slug = await uniqueSlug(data.name, async (s) =>
    Boolean(await repo.findAttributeBySlug(s)),
  );
  return repo.createAttribute({ ...data, slug });
};
export const update = async (id: number, data: UpdateAttributeInput) => {
  await get(id);
  if (data.name) {
    const same = await repo.findAttributeByName(data.name);
    if (same && same.id !== id)
      throw new ConflictError("Attribute name already exists");
  }
  const slug = data.name
    ? await uniqueSlug(data.name, async (s) => {
        const x = await repo.findAttributeBySlug(s);
        return Boolean(x && x.id !== id);
      })
    : undefined;
  return repo.updateAttribute(id, { ...data, ...(slug ? { slug } : {}) });
};
export const remove = async (id: number) => {
  await get(id);
  await repo.deleteAttribute(id);
};
export const status = async (id: number, isActive: boolean) => {
  await get(id);
  return repo.updateAttributeStatus(id, isActive);
};
export const values = async (attributeId: number) => {
  await get(attributeId);
  return repo.listValues(attributeId);
};
export const createValue = async (
  attributeId: number,
  data: CreateValueInput,
) => {
  await get(attributeId);
  if (await repo.findValueByValue(attributeId, data.value))
    throw new ConflictError("Attribute value already exists");
  const slug = await uniqueSlug(data.value, async (s) =>
    Boolean(await repo.findValueBySlug(attributeId, s)),
  );
  return repo.createValue({ attributeId, value: data.value, slug });
};
export const updateValue = async (
  attributeId: number,
  valueId: number,
  data: UpdateValueInput,
) => {
  const current = await repo.findValue(valueId, attributeId);
  if (!current) throw new NotFoundError("Attribute value not found");
  if (!data.value) return current;
  const same = await repo.findValueByValue(attributeId, data.value);
  if (same && same.id !== valueId)
    throw new ConflictError("Attribute value already exists");
  const slug = await uniqueSlug(data.value, async (s) => {
    const x = await repo.findValueBySlug(attributeId, s);
    return Boolean(x && x.id !== valueId);
  });
  return repo.updateValue(valueId, { ...data, slug });
};
export const removeValue = async (attributeId: number, valueId: number) => {
  if (!(await repo.findValue(valueId, attributeId)))
    throw new NotFoundError("Attribute value not found");
  await repo.deleteValue(valueId);
};
