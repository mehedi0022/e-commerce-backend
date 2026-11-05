import * as repo from "../repositories/category-attribute.repository.js";
import { ConflictError, NotFoundError } from "../../../errors/AppError.js";
import type { CategoryAttributeAssignment } from "../validations/category-attribute.validation.js";
import { hierarchy } from "../../category/repositories/category.repository.js";
import { ancestorCategoryIds } from "../../category/category-tree.js";

export const list = async (categoryId: number) => {
  if (!(await repo.findCategory(categoryId)))
    throw new NotFoundError("Category not found");

  // Resolve ancestor hierarchy for attribute inheritance
  const nodes = await hierarchy();
  const ancestors = ancestorCategoryIds(nodes, categoryId);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const allAssignments = await repo.listByCategories(ancestors);

  // Group by attributeId: child assignments take precedence over ancestor assignments
  const seenAttributes = new Set<number>();
  const effective: any[] = [];

  // 1. Direct assignments for categoryId
  for (const item of allAssignments.filter((a) => a.categoryId === categoryId)) {
    seenAttributes.add(item.attributeId);
    effective.push({
      ...item,
      isInherited: false,
      inheritedFrom: null,
    });
  }

  // 2. Inherited assignments from ancestors (immediate parent first)
  for (const ancestorId of ancestors.slice(1)) {
    for (const item of allAssignments.filter((a) => a.categoryId === ancestorId)) {
      if (!seenAttributes.has(item.attributeId)) {
        seenAttributes.add(item.attributeId);
        const parentNode = byId.get(ancestorId);
        effective.push({
          ...item,
          isInherited: true,
          inheritedFrom: {
            id: ancestorId,
            name: parentNode?.name || `Category #${ancestorId}`,
          },
        });
      }
    }
  }

  return effective;
};

export const replace = async (
  categoryId: number,
  assignments: CategoryAttributeAssignment[],
) => {
  const category = await repo.findCategory(categoryId);
  if (!category)
    throw new NotFoundError("Category not found");
  if (assignments.length && !category.isActive) throw new ConflictError("Activate the category before assigning attributes.");
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
