import { describe, it, expect } from "vitest";
import { normalizeBdPhone, isValidBdPhone } from "../../src/utils/phone.util.js";

describe("phone.util", () => {
  it("validates and normalizes valid Bangladeshi phone numbers", () => {
    expect(isValidBdPhone("01712345678")).toBe(true);
    expect(normalizeBdPhone("01712345678")).toBe("01712345678");

    expect(isValidBdPhone("+8801712345678")).toBe(true);
    expect(normalizeBdPhone("+8801712345678")).toBe("01712345678");

    expect(isValidBdPhone("8801812345678")).toBe(true);
    expect(normalizeBdPhone("8801812345678")).toBe("01812345678");

    expect(isValidBdPhone("01312345678")).toBe(true);
    expect(isValidBdPhone("01412345678")).toBe(true);
    expect(isValidBdPhone("01912345678")).toBe(true);
  });

  it("rejects invalid Bangladeshi phone numbers", () => {
    expect(isValidBdPhone("")).toBe(false);
    expect(isValidBdPhone("01212345678")).toBe(false); // 012 not valid BD prefix
    expect(isValidBdPhone("0171234567")).toBe(false);  // only 10 digits
    expect(isValidBdPhone("017123456789")).toBe(false); // 12 digits
    expect(isValidBdPhone("abcdefghijk")).toBe(false);
  });
});
