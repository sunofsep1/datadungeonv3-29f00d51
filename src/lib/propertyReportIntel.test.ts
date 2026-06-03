import { describe, expect, it } from "vitest";
import {
  intelFromPropertyReport,
  isLongHoldProperty,
  yearsSinceLastSale,
} from "@/lib/propertyReportIntel";

describe("propertyReportIntel", () => {
  it("reads last sale from sales_history", () => {
    const intel = intelFromPropertyReport({
      sales_history: [{ amount: 820000, date: "15/03/2018" }],
      bedrooms: 4,
    });
    expect(intel?.last_sale_price).toBe(820000);
    expect(intel?.bedrooms).toBe(4);
  });

  it("flags long hold when sale was 6+ years ago", () => {
    const report = {
      sales_history: [{ amount: 500000, date: "01/01/2015" }],
    };
    expect(yearsSinceLastSale(report)).toBeGreaterThanOrEqual(5);
    expect(isLongHoldProperty(report)).toBe(true);
  });
});
