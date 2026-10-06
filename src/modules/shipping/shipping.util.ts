export const normalizeLocation = (value: string | null | undefined) =>
  value?.trim().replace(/\s+/g, " ").toLowerCase() || null;
export const normalizeCode = (value: string) =>
  value.trim().replace(/\s+/g, "_").toUpperCase();
