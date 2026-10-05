import { describe, expect, it } from "vitest";
import { sanitizeDescription } from "../../src/modules/product/description-html.js";
import { createProductSchema } from "../../src/modules/product/validations/product.validation.js";
describe("rich product descriptions", () => {
  it("keeps supported formatting and uploaded image URLs", () => { const html = '<h2>Details</h2><p><strong>Cotton</strong></p><img src="https://cdn.example.test/shirt.webp" alt="Shirt" />'; expect(sanitizeDescription(html)).toBe(html); });
  it("removes scripts, events, style and embedded documents", () => { const html = sanitizeDescription('<script>alert(1)</script><iframe src="https://bad.test"></iframe><img src="/uploads/a.webp" onerror="alert(1)" style="position:fixed"><p onclick="alert(1)">Safe</p>'); expect(html).not.toMatch(/script|iframe|onerror|onclick|style/); expect(html).toContain('src="/uploads/a.webp"'); expect(html).toContain('<p>Safe</p>'); });
  it.each(['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', '//untrusted.test/a.png', 'blob:unsaved'])('rejects unsafe or nonpersistent image scheme %s', src => { expect(sanitizeDescription(`<img src="${src}">`)).not.toContain('src='); });
  it("preserves tables, headers, rows, cells and column spans", () => {
    const tableHtml = '<table><thead><tr><th colspan="2">Size Chart</th></tr></thead><tbody><tr><td>M</td><td>38</td></tr></tbody></table>';
    expect(sanitizeDescription(tableHtml)).toBe(tableHtml);
  });
  it("sanitizes API writes and enforces the size limit", () => { const result = createProductSchema.parse({ body: { name: "Shirt", description: '<p onmouseover="evil()">Cotton</p>' } }); expect(result.body.description).toBe('<p>Cotton</p>'); expect(() => createProductSchema.parse({ body: { name: 'Shirt', description: 'x'.repeat(10001) } })).toThrow(); });
});
