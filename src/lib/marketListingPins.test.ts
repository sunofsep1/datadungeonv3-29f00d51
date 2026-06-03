import { describe, expect, it } from "vitest";
import {
  buildMarketListingPinData,
  listingPinKind,
  listingIdFromMapPropertyId,
} from "@/lib/marketListingPins";
import type { ContactMarket } from "@/lib/contactMarkets";

const market: ContactMarket = {
  id: "victoria-point",
  label: "Victoria Point",
  suburbs: ["Victoria Point"],
  state: "QLD",
};

const properties = [
  {
    id: "prop-1",
    address_line1: "1 Main St",
    suburb: "Victoria Point",
    city: "Victoria Point",
    state: "QLD",
    latitude: -27.5,
    longitude: 153.2,
  },
  {
    id: "prop-2",
    address_line1: "9 Other Rd",
    suburb: "Cleveland",
    city: "Cleveland",
    state: "QLD",
    latitude: -27.52,
    longitude: 153.25,
  },
];

describe("listingPinKind", () => {
  it("maps pipeline stages to pin kinds", () => {
    expect(listingPinKind({ pipeline_stage: "appraisal" })).toBe("appraisal");
    expect(listingPinKind({ pipeline_stage: "listing" })).toBe("listing");
    expect(listingPinKind({ pipeline_stage: "under_contract" })).toBe("listing");
    expect(listingPinKind({ pipeline_stage: "settled" })).toBe("sale");
    expect(listingPinKind({ pipeline_stage: "listing", status: "sold" })).toBe("sale");
  });
});

describe("buildMarketListingPinData", () => {
  it("pins linked listings in market and adds extras for listing-only addresses", () => {
    const result = buildMarketListingPinData(
      [
        {
          id: "l-appraisal",
          address: "1 Main St, Victoria Point QLD",
          property_id: "prop-1",
          pipeline_stage: "appraisal",
        },
        {
          id: "l-listed",
          address: "55 Farm Lane, Victoria Point QLD",
          property_id: null,
          pipeline_stage: "listing",
        },
        {
          id: "l-other-suburb",
          address: "9 Other Rd, Cleveland QLD",
          property_id: "prop-2",
          pipeline_stage: "listing",
        },
      ],
      properties,
      market,
    );

    expect(result.pinByPropertyId["prop-1"]?.kind).toBe("appraisal");
    expect(result.pinByPropertyId["listing:l-listed"]?.kind).toBe("listing");
    expect(result.pinByPropertyId["prop-2"]).toBeUndefined();
    expect(result.extraProperties.map((p) => p.id)).toEqual(["listing:l-listed"]);
  });

  it("prefers sale pin over appraisal on same property", () => {
    const result = buildMarketListingPinData(
      [
        {
          id: "l-old",
          address: "1 Main St, Victoria Point QLD",
          property_id: "prop-1",
          pipeline_stage: "appraisal",
        },
        {
          id: "l-sold",
          address: "1 Main St, Victoria Point QLD",
          property_id: "prop-1",
          pipeline_stage: "settled",
        },
      ],
      properties,
      market,
    );

    expect(result.pinByPropertyId["prop-1"]?.kind).toBe("sale");
    expect(result.pinByPropertyId["prop-1"]?.listingId).toBe("l-sold");
  });
});

describe("listingIdFromMapPropertyId", () => {
  it("extracts listing id from synthetic property id", () => {
    expect(listingIdFromMapPropertyId("listing:abc-123")).toBe("abc-123");
    expect(listingIdFromMapPropertyId("prop-1")).toBeNull();
  });
});
