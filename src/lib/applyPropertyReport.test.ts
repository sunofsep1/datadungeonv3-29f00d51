import { describe, expect, it } from "vitest";
import {
  buildPropertyUpdatesFromReport,
  isPropertyColumnError,
  omitMissingColumn,
} from "@/lib/applyPropertyReport";
import type { ParsedPropertyReport } from "@/lib/parsePropertyReportPdf";

describe("buildPropertyUpdatesFromReport", () => {
  it("maps lot and building sizes to dual schema columns", () => {
    const parsed: ParsedPropertyReport = {
      lot_size: 600,
      building_size: 180,
      owner_names: "Jane Doe",
    };
    const updates = buildPropertyUpdatesFromReport(parsed, null);
    expect(updates.lot_size).toBe(600);
    expect(updates.land_area_sqm).toBe(600);
    expect(updates.building_size).toBe(180);
    expect(updates.floor_area_sqm).toBe(180);
    expect(updates.property_report).toMatchObject({
      owner_names: "Jane Doe",
      source: "pricefinder_pdf",
    });
  });
});

describe("isPropertyColumnError", () => {
  it("detects PGRST204 and missing column messages", () => {
    expect(isPropertyColumnError({ code: "PGRST204", message: "column missing" })).toBe(true);
    expect(isPropertyColumnError({ message: "column property_report does not exist" })).toBe(true);
    expect(isPropertyColumnError({ message: "permission denied" })).toBe(false);
  });
});

describe("omitMissingColumn", () => {
  it("removes the failing column from payload", () => {
    const payload = { bedrooms: 3, property_report: { x: 1 }, lot_size: 500 };
    const next = omitMissingColumn(payload, { message: "column 'property_report' does not exist" });
    expect(next).toEqual({ bedrooms: 3, lot_size: 500 });
  });
});
