/**
 * Normalizes a Bangladeshi phone number to 01XXXXXXXXX format.
 * Accepts formats: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX, with optional spaces or dashes.
 */
export const normalizeBdPhone = (phone: string): string => {
  if (!phone) return "";
  let clean = phone.trim().replace(/[\s-]/g, "");
  if (clean.startsWith("+880")) {
    clean = clean.slice(3);
  } else if (clean.startsWith("880")) {
    clean = clean.slice(2);
  }
  return clean;
};

/**
 * Validates whether the given string is a valid BD mobile phone number.
 * Must be 11 digits starting with 01 and valid operator digit (3-9).
 */
export const isValidBdPhone = (phone: string): boolean => {
  const normalized = normalizeBdPhone(phone);
  return /^01[3-9]\d{8}$/.test(normalized);
};
