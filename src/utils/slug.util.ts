import slugify from "slugify";

export const toSlug = (value: string) =>
  slugify(value, { lower: true, strict: true, trim: true });

export const uniqueSlug = async (
  value: string,
  exists: (slug: string) => Promise<boolean>,
) => {
  const base = toSlug(value) || "item";
  let candidate = base;
  let suffix = 2;
  while (await exists(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
};
