import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  product: { findById: vi.fn(), findPublicBySlug: vi.fn(), findCategory: vi.fn(), findCategoryChild: vi.fn(), findBrand: vi.fn(), findBySlug: vi.fn(), update: vi.fn(), clearCategories: vi.fn(), addCategory: vi.fn() },
  variants: { list: vi.fn() },
  images: { list: vi.fn(), find: vi.fn(), findValues: vi.fn(), findVariants: vi.fn(), update: vi.fn(), clearPrimary: vi.fn(), clearValues: vi.fn(), addValue: vi.fn() },
  upload: { upload: vi.fn(), delete: vi.fn() },
}));
vi.mock("../../src/prisma/db.js", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("../../src/modules/product/repositories/product.repository.js", () => mocks.product);
vi.mock("../../src/modules/product/repositories/product-variant.repository.js", () => mocks.variants);
vi.mock("../../src/modules/product/repositories/product-image.repository.js", () => mocks.images);
vi.mock("../../src/modules/upload/upload.module.js", () => ({ uploadService: mocks.upload }));
vi.mock("../../src/utils/slug.util.js", () => ({ uniqueSlug: async () => "shirt" }));

import * as product from "../../src/modules/product/services/product.service.js";
import * as image from "../../src/modules/product/services/product-image.service.js";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async (fn: (tx: object) => unknown) => fn({}));
  mocks.product.findById.mockResolvedValue({ id: 1 });
  mocks.product.findCategory.mockResolvedValue({ id: 2, isActive: true });
  mocks.images.find.mockResolvedValue({ id: 3, isPrimary: true, storageKey: "old-key", attributeValues: [] });
  mocks.images.findValues.mockResolvedValue([]);
  mocks.images.update.mockResolvedValue({ id: 3, imageUrl: "/new.png", isPrimary: false });
  mocks.upload.upload.mockResolvedValue({ key: "new-key", url: "/new.png" });
  mocks.upload.delete.mockResolvedValue(undefined);
});

describe("product editor persistence", () => {
  it("rejects a new primary category with children", async () => {
    mocks.product.findCategoryChild.mockResolvedValue({ id: 3 });
    await expect(product.update(1, { categories: [{ categoryId: 2, isPrimary: true, sortOrder: 0 }] })).rejects.toThrow("leaf category");
    expect(mocks.product.update).not.toHaveBeenCalled();
  });
  it("preserves an unchanged legacy primary category with children", async () => {
    const categories = [{ categoryId: 2, isPrimary: true, sortOrder: 0 }];
    mocks.product.findById.mockResolvedValue({ id: 1, categories });
    mocks.product.findCategoryChild.mockResolvedValue({ id: 3 });
    await expect(product.update(1, { name: "Shirt", categories })).resolves.toBeDefined();
  });
  it("separates category assignments from scalar product updates", async () => {
    const categories = [{ categoryId: 2, isPrimary: true, sortOrder: 0 }];
    await product.update(1, { name: "Shirt", categories });
    expect(mocks.product.update).toHaveBeenCalledWith({}, 1, { name: "Shirt", slug: "shirt" });
    expect(mocks.product.addCategory).toHaveBeenCalledWith({}, 1, categories[0]);
  });
  it("allows category-only changes without an invalid empty scalar mutation", async () => {
    await product.update(1, { categories: [] });
    expect(mocks.product.update).not.toHaveBeenCalled();
    expect(mocks.product.clearCategories).toHaveBeenCalledWith({}, 1);
  });
  it("rejects an inactive category", async () => {
    mocks.product.findCategory.mockResolvedValue({ id: 2, isActive: false });
    await expect(product.update(1, { categories: [{ categoryId: 2, isPrimary: true, sortOrder: 0 }] })).rejects.toThrow("Inactive category");
    expect(mocks.product.update).not.toHaveBeenCalled();
  });
  it("returns only public variant fields on storefront detail", async () => {
    mocks.product.findPublicBySlug.mockResolvedValue({ id: 1 });
    mocks.variants.list.mockResolvedValue([{ id: 2, isActive: true, price: "20", costPrice: "4", internalSecret: "secret" }, { id: 3, isActive: false }]);
    mocks.images.list.mockResolvedValue([]);
    const result = await product.publicGetBySlug("shirt");
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0]).not.toHaveProperty("costPrice");
    expect(result.variants[0]).not.toHaveProperty("internalSecret");
  });
  it("does not let an existing cover gain attribute links while remaining primary", async () => {
    mocks.images.findValues.mockResolvedValue([{ id: 10, attributeId: 1, isActive: true, attribute: { isActive: true } }]);
    mocks.images.findVariants.mockResolvedValue([{ attributeValues: [{ attributeValueId: 10 }] }]);
    await expect(image.update(1, 3, undefined, { attributeValueIds: [10] })).rejects.toThrow("Only general images");
    expect(mocks.images.update).not.toHaveBeenCalled();
  });
  it("rejects an empty image update", async () => {
    await expect(image.update(1, 3, undefined, {})).rejects.toThrow("metadata field");
  });
  it("returns an image DTO after file replacement, even if old-file cleanup fails", async () => {
    mocks.upload.delete.mockRejectedValue(new Error("storage offline"));
    await expect(image.update(1, 3, {} as Express.Multer.File, { isPrimary: false })).resolves.toEqual({ id: 3, imageUrl: "/new.png", isPrimary: false });
    expect(mocks.upload.delete).toHaveBeenCalledWith("old-key");
  });
  it("cleans the new upload if the database write fails", async () => {
    mocks.images.update.mockRejectedValue(new Error("write failed"));
    await expect(image.update(1, 3, {} as Express.Multer.File, { isPrimary: false })).rejects.toThrow("write failed");
    expect(mocks.upload.delete).toHaveBeenCalledWith("new-key");
    expect(mocks.upload.delete).not.toHaveBeenCalledWith("old-key");
  });
});
