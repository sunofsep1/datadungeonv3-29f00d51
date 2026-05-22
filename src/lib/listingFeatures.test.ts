import { describe, expect, it } from "vitest";
import {
  catalogFeaturesByCategory,
  mergeListingFeatures,
  parseListingFeatureFlags,
  listingFeatureLabel,
} from "./listingFeatures";

describe("parseListingFeatureFlags", () => {
  it("filters unknown keys and dedupes", () => {
    expect(parseListingFeatureFlags(["pool", "pool", "not_real", "air_conditioning"])).toEqual([
      "pool",
      "air_conditioning",
    ]);
  });

  it("returns empty for non-array", () => {
    expect(parseListingFeatureFlags(null)).toEqual([]);
    expect(parseListingFeatureFlags({})).toEqual([]);
  });
});

describe("mergeListingFeatures", () => {
  it("combines flags and property labels", () => {
    const merged = mergeListingFeatures(["pool"], ["Custom Feature"]);
    expect(merged).toContain("pool");
    expect(merged).toContain("custom feature");
  });
});

describe("catalogFeaturesByCategory", () => {
  it("groups all catalog items", () => {
    const groups = catalogFeaturesByCategory();
    expect(groups.length).toBeGreaterThan(5);
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBeGreaterThan(40);
  });
});

describe("listingFeatureLabel", () => {
  it("returns label for known key", () => {
    expect(listingFeatureLabel("ocean_views")).toBe("Ocean Views");
  });
});
