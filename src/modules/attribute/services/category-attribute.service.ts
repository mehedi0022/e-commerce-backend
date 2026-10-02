import * as repo from "../repositories/category-attribute.repository.js";
import { ConflictError, NotFoundError } from "../../../errors/AppError.js";
import type { CategoryAttributeAssignment } from "../validations/category-attribute.validation.js";

export const list = async (categoryId: number) => {
  if (!(await repo.findCategory(categoryId)))
    throw new NotFoundError("Category not found");
  return repo.list(categoryId);
};

export const replace = async (
  categoryId: number,
  assignments: CategoryAttributeAssignment[],
) => {
  const category = await repo.findCategory(categoryId);
  if (!category)
    throw new NotFoundError("Category not found");
  if (assignments.length && !category.isActive) throw new ConflictError("Activate the category before assigning attributes.");
  if (assignments.length && await repo.findChild(categoryId)) throw new ConflictError("Assign variant attributes to a leaf category, not a category with subcategories.");
  const ids = new Set<number>();
  for (const assignment of assignments) {
    if (ids.has(assignment.attributeId))
      throw new ConflictError("An attribute cannot be assigned more than once");
    ids.add(assignment.attributeId);
    const attribute = await repo.findAttribute(assignment.attributeId);
    if (!attribute)
      throw new NotFoundError(`Attribute ${assignment.attributeId} not found`);
    if (!attribute.isActive) throw new ConflictError(`Activate ${attribute.name} before assigning it.`);
    if (assignment.isRequired && !(await repo.activeValues(assignment.attributeId)).length)
      throw new ConflictError(`Add an active value to ${attribute.name} before making it required.`);
  }
  const required = assignments.filter(a => a.isRequired).map(a => a.attributeId);
  for (const variant of await repo.primaryVariants(categoryId)) {
    const selected = new Set(variant.attributeValues.flatMap(value => value.attributeValue ? [value.attributeValue.attributeId] : []));
    if ([...selected].some(id => !ids.has(id))) throw new ConflictError(`Variant ${variant.sku} uses an attribute you are removing. Update the affected variants first.`);
    if (required.some(id => !selected.has(id))) throw new ConflictError(`Variant ${variant.sku} is missing a required attribute. Assign it as optional, update the variants, then make it required.`);
  }
  return repo.replace(categoryId, assignments);
};
