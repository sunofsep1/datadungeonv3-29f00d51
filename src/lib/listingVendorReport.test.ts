import { describe, expect, it } from "vitest";
import { buildListingVendorCampaignStats } from "@/lib/listingVendorReport";

describe("buildListingVendorCampaignStats", () => {
  it("aggregates offers and inspection attendees", () => {
    const stats = buildListingVendorCampaignStats(
      { created_at: "2026-01-01T00:00:00Z", pipeline_stage: "listing" },
      [{ status: "pending" }, { status: "withdrawn" }],
      [{ attendeeCount: 3 }, { attendeeCount: 2 }],
      new Date("2026-05-01T12:00:00Z"),
    );
    expect(stats.openInspectionCount).toBe(2);
    expect(stats.attendeeCount).toBe(5);
    expect(stats.offerCount).toBe(2);
    expect(stats.activeOfferCount).toBe(1);
    expect(stats.daysOnMarket).toBeGreaterThan(0);
  });
});
