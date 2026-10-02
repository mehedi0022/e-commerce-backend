import { describe, expect, it } from "vitest";
import { imageMetadataSchema } from "../../src/modules/product/validations/product-image.validation.js";

describe("product image metadata", () => {
  it("parses multipart false as false, integers and JSON ID arrays", () => {
    expect(imageMetadataSchema.parse({ body: { isPrimary: "false", sortOrder: "2", attributeValueIds: "[1,2]" } }).body).toEqual({ isPrimary: false, sortOrder: 2, attributeValueIds: [1, 2] });
  });
  it("supports JSON metadata-only patches without double parsing", () => {
    expect(imageMetadataSchema.parse({ body: { isPrimary: true, attributeValueIds: [] } }).body).toEqual({ isPrimary: true, attributeValueIds: [] });
  });
  it.each([{ attributeValueIds: "[broken" }, { attributeValueIds: "[1,1]" }, { isPrimary: "not-a-boolean" }, { sortOrder: -1 }, { altText: "a".repeat(501) }, { unexpected: true }])("rejects invalid metadata without throwing from safeParse: %j", body => {
    expect(imageMetadataSchema.safeParse({ body }).success).toBe(false);
  });
});
