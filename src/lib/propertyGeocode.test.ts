import { afterEach, describe, expect, it } from "vitest";
import {
  formatPropertyGeocodeAddress,
  getGeocodeBlockedMessage,
  hasValidCoordinates,
  isGeocodeServiceBlocked,
  parseCompoundAustralianAddress,
  parseInlineAustralianAddress,
  propertyNeedsGeocode,
  resetGeocodeServiceStateForTests,
  setGeocodeBlockedForTests,
  stripTrailingSuburbFromLine,
} from "@/lib/propertyGeocode";

describe("propertyGeocode", () => {
  afterEach(() => {
    resetGeocodeServiceStateForTests();
  });
  it("formats AU property address for geocoding", () => {
    expect(
      formatPropertyGeocodeAddress({
        address_line1: "12 Hickory Dr",
        suburb: "Victoria Point",
        state: "QLD",
        postcode: "4165",
      }),
    ).toBe("12 Hickory Dr, Victoria Point, QLD, 4165, Australia");
  });

  it("falls back to street_address when address_line1 missing", () => {
    expect(
      formatPropertyGeocodeAddress({
        street_address: "8 Bay Terrace",
        suburb: "Wellington Point",
        state: "QLD",
        postcode: "4160",
      }),
    ).toBe("8 Bay Terrace, Wellington Point, QLD, 4160, Australia");
  });

  it("returns null when no address parts", () => {
    expect(formatPropertyGeocodeAddress({})).toBeNull();
  });

  it("detects valid coordinates", () => {
    expect(hasValidCoordinates({ latitude: -27.58, longitude: 153.26 })).toBe(true);
    expect(hasValidCoordinates({ latitude: null, longitude: 153.26 })).toBe(false);
  });

  it("defaults missing state to QLD for geocoding", () => {
    expect(
      formatPropertyGeocodeAddress({
        address_line1: "13 Fleay Street",
        suburb: "Redland Bay",
        postcode: "4165",
      }),
    ).toBe("13 Fleay Street, Redland Bay, QLD, 4165, Australia");
  });

  it("skips duplicate suburb in street line", () => {
    expect(
      formatPropertyGeocodeAddress({
        address_line1: "Redland Bay",
        suburb: "Redland Bay",
        postcode: "4165",
      }),
    ).toBe("Redland Bay, QLD, 4165, Australia");
  });

  it("parses compound address line into street and suburb", () => {
    expect(
      formatPropertyGeocodeAddress({
        address_line1: "29 Villa Drive, REDLAND BAY, QLD 4165",
      }),
    ).toBe("29 Villa Drive, REDLAND BAY, QLD, 4165, Australia");
  });

  it("parseCompoundAustralianAddress splits CSV lines", () => {
    expect(parseCompoundAustralianAddress("145 Mill Street, Redland Bay, QLD 4165")).toEqual({
      street: "145 Mill Street",
      suburb: "Redland Bay",
      state: "QLD",
      postcode: "4165",
    });
  });

  it("parseInlineAustralianAddress splits space-separated lines", () => {
    expect(parseInlineAustralianAddress("42 David Road Holland Park QLD 4121")).toEqual({
      street: "42 David Road",
      suburb: "Holland Park",
      state: "QLD",
      postcode: "4121",
    });
  });

  it("strips trailing suburb duplicated in street line", () => {
    expect(
      formatPropertyGeocodeAddress({
        address_line1: "42 David Road Holland Park",
        suburb: "Holland Park",
        state: "QLD",
        postcode: "4121",
      }),
    ).toBe("42 David Road, Holland Park, QLD, 4121, Australia");
  });

  it("stripTrailingSuburbFromLine removes suburb suffix", () => {
    expect(stripTrailingSuburbFromLine("83 Diamond Street Holland Park", "Holland Park")).toBe(
      "83 Diamond Street",
    );
  });

  it("flags properties needing geocode", () => {
    expect(
      propertyNeedsGeocode({
        address_line1: "1 Main St",
        suburb: "Cleveland",
        state: "QLD",
      }),
    ).toBe(true);
    expect(
      propertyNeedsGeocode({
        address_line1: "1 Main St",
        suburb: "Cleveland",
        latitude: -27.5,
        longitude: 153.2,
      }),
    ).toBe(false);
  });

  it("blocks further geocoding after REQUEST_DENIED", () => {
    expect(isGeocodeServiceBlocked()).toBe(false);
    setGeocodeBlockedForTests("REQUEST_DENIED");
    expect(isGeocodeServiceBlocked()).toBe(true);
    expect(getGeocodeBlockedMessage()).toMatch(/Geocoding API|Places API/i);
  });
});
