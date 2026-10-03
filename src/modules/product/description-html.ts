import sanitizeHtml from "sanitize-html";

export function sanitizeDescription(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "s", "u", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "img", "hr", "pre", "code"],
    allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "title"] },
    allowedSchemes: ["http", "https", "mailto"], allowedSchemesByTag: { img: ["http", "https"] }, allowProtocolRelative: false,
  });
}
