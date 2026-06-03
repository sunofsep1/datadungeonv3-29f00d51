import { describe, expect, it } from "vitest";
import { legacyListingPortalPatch, portalLabel } from "@/lib/listingPortals";

describe("listingPortals", () => {
  it("labels known portals", () => {
    expect(portalLabel("domain_com_au")).toBe("Domain.com.au");
  });

  it("maps domain to legacy mkt column", () => {
    expect(legacyListingPortalPatch("domain_com_au", true, "live")).toEqual({ mkt_domain_status: "live" });
    expect(legacyListingPortalPatch("domain_com_au", false, "not_listed")).toEqual({ mkt_domain_status: "not_listed" });
  });

  it("returns null for unknown portals", () => {
    expect(legacyListingPortalPatch("homely", true, "live")).toBeNull();
  });
});
