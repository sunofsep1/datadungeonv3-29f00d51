import { describe, expect, it } from "vitest";
import { listingRegionKey, parseListingRegionFromAddress } from "./listingAddressRegion";

describe("listingAddressRegion", () => {
  it("parses inline AU address", () => {
    expect(parseListingRegionFromAddress("12 Main St, New Farm QLD 4005")).toBe("New Farm, QLD");
  });

  it("prefers property suburb when linked", () => {
    expect(
      listingRegionKey("12 Main St", { suburb: "Bulimba", state: "QLD", city: null }),
    ).toBe("Bulimba, QLD");
  });
});
