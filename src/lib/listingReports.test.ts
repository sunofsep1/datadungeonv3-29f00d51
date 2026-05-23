import { describe, expect, it } from "vitest";
import {
  buildAgencyExpiryReport,
  buildCurrentListingsReport,
  buildDaysOnMarketReport,
  buildOffersPipelineReport,
  buildPipelineMonitor,
  buildUpcomingSettlementsReport,
  listingDaysOnMarket,
  daysUntilAgencyExpiry,
} from "./listingReports";

const baseListing = {
  id: "1",
  address: "1 Test St",
  pipeline_stage: "listing",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
  price: 1000000,
  search_price: null,
  display_price: null,
};

describe("listingDaysOnMarket", () => {
  it("returns null for appraisal stage", () => {
    expect(
      listingDaysOnMarket(
        { ...baseListing, pipeline_stage: "appraisal" },
        new Date("2026-05-21"),
      ),
    ).toBeNull();
  });

  it("uses key_date_listed when set", () => {
    expect(
      listingDaysOnMarket(
        {
          ...baseListing,
          key_date_listed: "2026-05-01T00:00:00.000Z",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        new Date("2026-05-21"),
      ),
    ).toBe(20);
  });
});

describe("buildPipelineMonitor", () => {
  it("groups listings by stage", () => {
    const summary = buildPipelineMonitor([
      baseListing,
      { ...baseListing, id: "2", pipeline_stage: "appraisal", address: "2 Test St" },
    ]);
    expect(summary.find((s) => s.stage === "listing")?.count).toBe(1);
    expect(summary.find((s) => s.stage === "appraisal")?.count).toBe(1);
  });
});

describe("buildDaysOnMarketReport", () => {
  it("sorts by DOM descending", () => {
    const rows = buildDaysOnMarketReport(
      [
        {
          ...baseListing,
          key_date_listed: "2026-05-15T00:00:00.000Z",
          address: "Newer",
        },
        {
          ...baseListing,
          id: "2",
          key_date_listed: "2026-04-01T00:00:00.000Z",
          address: "Older",
        },
      ],
      new Date("2026-05-21"),
    );
    expect(rows[0]?.address).toBe("Older");
    expect(rows[0]?.domDays).toBeGreaterThan(rows[1]?.domDays ?? 0);
  });
});

describe("buildAgencyExpiryReport", () => {
  it("includes listings expiring within window", () => {
    const rows = buildAgencyExpiryReport(
      [
        {
          ...baseListing,
          key_date_agency_expiry: "2026-06-01T00:00:00.000Z",
        },
        {
          ...baseListing,
          id: "2",
          key_date_agency_expiry: "2027-01-01T00:00:00.000Z",
        },
      ],
      { withinDays: 90 },
      new Date("2026-05-21"),
    );
    expect(rows).toHaveLength(1);
    expect(daysUntilAgencyExpiry(rows[0]!, new Date("2026-05-21"))).toBe(11);
  });
});

describe("buildCurrentListingsReport", () => {
  it("excludes appraisal and past client", () => {
    const rows = buildCurrentListingsReport([
      baseListing,
      { ...baseListing, id: "2", pipeline_stage: "appraisal", address: "Appraisal St" },
      { ...baseListing, id: "3", pipeline_stage: "past_client", address: "Past St" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.address).toBe("1 Test St");
  });
});

describe("buildOffersPipelineReport", () => {
  it("includes only open offer statuses", () => {
    const listingsById = new Map([[baseListing.id, baseListing]]);
    const rows = buildOffersPipelineReport(
      [
        {
          id: "o1",
          listing_id: baseListing.id,
          ref_code: "OFF-1",
          offer_date: "2026-05-01",
          offer_price: 950000,
          status: "submitted",
          buyer: { name: "Sam Buyer", first_name: "Sam", last_name: "Buyer" },
        },
        {
          id: "o2",
          listing_id: baseListing.id,
          ref_code: "OFF-2",
          offer_date: "2026-05-02",
          offer_price: 900000,
          status: "rejected",
          buyer: null,
        },
      ],
      listingsById,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.buyerName).toBe("Sam Buyer");
  });
});

describe("buildUpcomingSettlementsReport", () => {
  it("includes contract listings settling soon", () => {
    const rows = buildUpcomingSettlementsReport(
      [
        {
          ...baseListing,
          pipeline_stage: "under_contract",
          key_date_settlement: "2026-06-15T00:00:00.000Z",
        },
        {
          ...baseListing,
          id: "2",
          pipeline_stage: "listing",
          key_date_settlement: "2026-06-01T00:00:00.000Z",
        },
      ],
      { withinDays: 60 },
      new Date("2026-05-21"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.daysUntil).toBe(25);
  });
});
