import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, phoneToTelHref } from "./formatPhone";

describe("phoneToTelHref", () => {
  it("returns null for empty input", () => {
    expect(phoneToTelHref(null)).toBeNull();
    expect(phoneToTelHref("")).toBeNull();
    expect(phoneToTelHref("   ")).toBeNull();
  });

  it("normalises Australian mobile to +61", () => {
    expect(phoneToTelHref("0412 345 678")).toBe("tel:+61412345678");
    expect(phoneToTelHref("61412345678")).toBe("tel:+61412345678");
  });

  it("preserves explicit plus prefix", () => {
    expect(phoneToTelHref("+61 412 345 678")).toBe("tel:+61412345678");
  });
});

describe("formatPhoneDisplay", () => {
  it("formats 04 mobile", () => {
    expect(formatPhoneDisplay("0412345678")).toBe("0412 345 678");
  });
});
