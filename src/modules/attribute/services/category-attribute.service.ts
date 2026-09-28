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
  if (!(await repo.findCategory(categoryId)))
    throw new NotFoundError("Category not found");
  const ids = new Set<number>();
  for (const assignment of assignments) {
    if (ids.has(assignment.attributeId))
      throw new ConflictError("An attribute cannot be assigned more than once");
    ids.add(assignment.attributeId);
    if (!(await repo.findAttribute(assignment.attributeId)))
      throw new NotFoundError(`Attribute ${assignment.attributeId} not found`);
  }
  return repo.replace(categoryId, assignments);
};
