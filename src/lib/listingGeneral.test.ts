import { describe, expect, it } from "vitest";
import { annualizeOutgoingAmount, computeTotalOutgoingsPerYear } from "./listingGeneral";

describe("annualizeOutgoingAmount", () => {
  it("multiplies quarterly amounts by 4", () => {
    expect(annualizeOutgoingAmount(500, "pq")).toBe(2000);
  });

  it("treats pa as annual", () => {
    expect(annualizeOutgoingAmount(1200, "pa")).toBe(1200);
  });
});

describe("computeTotalOutgoingsPerYear", () => {
  it("sums all outgoing lines", () => {
    expect(
      computeTotalOutgoingsPerYear({
        water_rates_amount: 400,
        water_rates_period: "pq",
        council_rates_amount: 2500,
        council_rates_period: "pa",
      }),
    ).toBe(4100);
  });
});
