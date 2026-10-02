import { beforeEach, describe, expect, it, vi } from "vitest";
import { categoryMetadata, descendantCategoryIds } from "../../src/modules/category/category-tree.js";

const mocks = vi.hoisted(() => ({
  assignments: { findCategory: vi.fn(), findChild: vi.fn(), findAttribute: vi.fn(), activeValues: vi.fn(), primaryVariants: vi.fn(), replace: vi.fn() },
  attributes: { findValue: vi.fn(), valueInUse: vi.fn(), findRequiredAssignment: vi.fn(), listValues: vi.fn(), updateValue: vi.fn(), deleteValue: vi.fn(), findAttribute: vi.fn(), attributeInUse: vi.fn(), deleteAttribute: vi.fn(), updateAttributeStatus: vi.fn() },
  categories: { findById: vi.fn(), findPrimaryProduct: vi.fn(), findAttributeAssignment: vi.fn(), findChild: vi.fn(), findProductAssignment: vi.fn(), remove: vi.fn(), findByNameOrSlug: vi.fn(), findBySlug: vi.fn(), create: vi.fn(), update: vi.fn() },
  brands: { findById: vi.fn(), findProduct: vi.fn(), remove: vi.fn() },
}));
vi.mock("../../src/modules/attribute/repositories/category-attribute.repository.js", () => mocks.assignments);
vi.mock("../../src/modules/attribute/repositories/attribute.repository.js", () => mocks.attributes);
vi.mock("../../src/modules/category/repositories/category.repository.js", () => mocks.categories);
vi.mock("../../src/modules/brand/repositories/brand.repository.js", () => mocks.brands);
vi.mock("../../src/modules/upload/upload.module.js", () => ({ uploadService: { delete: vi.fn() } }));
vi.mock("../../src/utils/slug.util.js", () => ({ uniqueSlug: async () => "new" }));
import * as assignments from "../../src/modules/attribute/services/category-attribute.service.js";
import * as attributes from "../../src/modules/attribute/services/attribute.service.js";
import * as categories from "../../src/modules/category/services/category.service.js";
import * as brands from "../../src/modules/brand/services/brand.service.js";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.assignments.findCategory.mockResolvedValue({ id: 1, isActive: true });
  mocks.assignments.findAttribute.mockResolvedValue({ id: 10, name: "Size", isActive: true });
  mocks.assignments.activeValues.mockResolvedValue([{ id: 100 }]);
  mocks.assignments.primaryVariants.mockResolvedValue([]);
  mocks.attributes.findValue.mockResolvedValue({ id: 100, isActive: true });
  mocks.attributes.findAttribute.mockResolvedValue({ id: 10 });
  mocks.categories.findById.mockResolvedValue({ id: 1, parentId: null });
  mocks.brands.findById.mockResolvedValue({ id: 1 });
});
describe("category hierarchy", () => {
  const tree = [{ id: 1, parentId: null, name: "Clothing" }, { id: 2, parentId: 1, name: "Men" }, { id: 3, parentId: 2, name: "Tees" }, { id: 4, parentId: null, name: "Home" }];
  it("expands parent browsing to every descendant but excludes other branches", () => expect(descendantCategoryIds(tree, 1)).toEqual([1, 2, 3]));
  it("includes the full path and recognizes both root and nested leaves", () => { const meta = categoryMetadata(tree); expect(meta.get(3)).toEqual({ path: "Clothing / Men / Tees", isLeaf: true }); expect(meta.get(1)?.isLeaf).toBe(false); expect(meta.get(4)?.isLeaf).toBe(true); });
  it("terminates on malformed cycles", () => expect(descendantCategoryIds([{ id: 1, name: "A", parentId: 2 }, { id: 2, name: "B", parentId: 1 }], 1)).toEqual([1, 2]));
  it("does not turn an existing product category into a group", async () => { mocks.categories.findPrimaryProduct.mockResolvedValue({ productId: 4 }); await expect(categories.create({ name: "Child", parentId: 1 })).rejects.toThrow("Move those products"); expect(mocks.categories.create).not.toHaveBeenCalled(); });
  it("does not strand attributes on a newly converted group", async () => { mocks.categories.findAttributeAssignment.mockResolvedValue({ id: 8 }); await expect(categories.create({ name: "Child", parentId: 1 })).rejects.toThrow("Clear its assignments"); expect(mocks.categories.create).not.toHaveBeenCalled(); });
  it("blocks deletion of categories with children", async () => { mocks.categories.findChild.mockResolvedValue({ id: 2 }); await expect(categories.remove(1)).rejects.toThrow("subcategories"); expect(mocks.categories.remove).not.toHaveBeenCalled(); });
  it("blocks deletion of categories referenced by products", async () => { mocks.categories.findProductAssignment.mockResolvedValue({ productId: 2 }); await expect(categories.remove(1)).rejects.toThrow("used by products"); });
  it("blocks deletion of referenced brands", async () => { mocks.brands.findProduct.mockResolvedValue({ id: 2 }); await expect(brands.remove(1)).rejects.toThrow("used by products"); expect(mocks.brands.remove).not.toHaveBeenCalled(); });
});
describe("category assignment safety", () => {
  const size = { attributeId: 10, isRequired: true, sortOrder: 0 };
  it("saves required attributes with values on an empty leaf", async () => { await assignments.replace(1, [size]); expect(mocks.assignments.replace).toHaveBeenCalledWith(1, [size]); });
  it("rejects assignments to a parent group", async () => { mocks.assignments.findChild.mockResolvedValue({ id: 2 }); await expect(assignments.replace(1, [size])).rejects.toThrow("leaf category"); });
  it("rejects a required attribute without active values", async () => { mocks.assignments.activeValues.mockResolvedValue([]); await expect(assignments.replace(1, [size])).rejects.toThrow("active value"); });
  it("rejects duplicate attributes", async () => { await expect(assignments.replace(1, [size, size])).rejects.toThrow("more than once"); });
  it("preserves options already used by a variant", async () => { mocks.assignments.primaryVariants.mockResolvedValue([{ sku: "TEE-M", attributeValues: [{ attributeValue: { attributeId: 10 } }] }]); await expect(assignments.replace(1, [])).rejects.toThrow("TEE-M"); expect(mocks.assignments.replace).not.toHaveBeenCalled(); });
  it("requires existing variants to be filled before making a new option required", async () => { mocks.assignments.primaryVariants.mockResolvedValue([{ sku: "TEE", attributeValues: [] }]); await expect(assignments.replace(1, [size])).rejects.toThrow("optional"); await assignments.replace(1, [{ ...size, isRequired: false }]); expect(mocks.assignments.replace).toHaveBeenCalledTimes(1); });
  it("allows clearing unused legacy assignments on an inactive group", async () => { mocks.assignments.findCategory.mockResolvedValue({ id: 1, isActive: false }); mocks.assignments.findChild.mockResolvedValue({ id: 2 }); await assignments.replace(1, []); expect(mocks.assignments.replace).toHaveBeenCalledWith(1, []); });
});
describe("shared values", () => {
  it("supports value status and order without requiring a rename", async () => { await attributes.updateValue(10, 100, { isActive: true, sortOrder: 3 }); expect(mocks.attributes.updateValue).toHaveBeenCalledWith(100, { isActive: true, sortOrder: 3 }); });
  it("blocks deactivating or deleting referenced values", async () => { mocks.attributes.valueInUse.mockResolvedValue(true); await expect(attributes.updateValue(10, 100, { isActive: false })).rejects.toThrow("used by a product"); await expect(attributes.removeValue(10, 100)).rejects.toThrow("used by a product"); });
  it("keeps at least one active value for required assignments", async () => { mocks.attributes.findRequiredAssignment.mockResolvedValue({ id: 5 }); mocks.attributes.listValues.mockResolvedValue([{ id: 100, isActive: true }]); await expect(attributes.updateValue(10, 100, { isActive: false })).rejects.toThrow("last active value"); await expect(attributes.removeValue(10, 100)).rejects.toThrow("last active value"); });
  it("allows removal of an unused inactive value", async () => { mocks.attributes.findValue.mockResolvedValue({ id: 100, isActive: false }); await attributes.removeValue(10, 100); expect(mocks.attributes.deleteValue).toHaveBeenCalledWith(100); });
  it("blocks deactivating an assigned attribute", async () => { mocks.attributes.attributeInUse.mockResolvedValue(true); await expect(attributes.status(10, false)).rejects.toThrow("assigned to categories"); });
});
