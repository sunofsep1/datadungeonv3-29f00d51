import { describe, expect, it } from "vitest";
import {
  formatListingAddressForMode,
  formatListingAddressForPortal,
  parseListingAddressParts,
} from "./listingAddressDisplay";

describe("parseListingAddressParts", () => {
  it("extracts street and suburb from AU address", () => {
    const parts = parseListingAddressParts("12 Ocean Ave, Mermaid Beach, QLD 4218");
    expect(parts.street).toBe("12 Ocean Ave");
    expect(parts.suburb).toBe("Mermaid Beach");
  });
});

describe("formatListingAddressForMode", () => {
  it("returns suburb only when mode is suburb_only", () => {
    const out = formatListingAddressForMode("12 Ocean Ave, Mermaid Beach, QLD 4218", "suburb_only");
    expect(out.toLowerCase()).toContain("mermaid beach");
    expect(out.toLowerCase()).not.toContain("ocean");
  });
});

describe("formatListingAddressForPortal", () => {
  it("withholds street when hide flag set", () => {
    const out = formatListingAddressForPortal(
      "12 Ocean Ave, Mermaid Beach, QLD 4218",
      "full",
      true,
    );
    expect(out.toLowerCase()).toContain("mermaid beach");
    expect(out.toLowerCase()).not.toContain("ocean");
  });

  it("falls back when hide flag set and suburb unknown", () => {
    expect(formatListingAddressForPortal("", "full", true)).toBe("Address available on request");
  });
});
