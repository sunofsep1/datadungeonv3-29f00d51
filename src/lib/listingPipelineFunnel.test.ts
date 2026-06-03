import { describe, expect, it } from "vitest";
import { buildListingPipelineFunnel } from "@/lib/listingPipelineFunnel";

describe("buildListingPipelineFunnel", () => {
  it("aggregates count, value, and GCI per stage", () => {
    const result = buildListingPipelineFunnel(
      [
        { pipeline_stage: "appraisal", search_price: 1_000_000, price: null },
        { pipeline_stage: "listing", search_price: 2_000_000, price: null },
        { pipeline_stage: "past_client", search_price: 9_000_000, price: null },
      ],
      2.5,
    );

    const appraisal = result.rows.find((r) => r.stageId === "appraisal");
    const listing = result.rows.find((r) => r.stageId === "listing");
    expect(appraisal?.count).toBe(1);
    expect(appraisal?.totalValue).toBe(1_000_000);
    expect(appraisal?.projectedGci).toBe(25_000);
    expect(listing?.count).toBe(1);
    expect(result.totals.count).toBe(2);
    expect(result.totals.totalValue).toBe(3_000_000);
    expect(result.totals.projectedGci).toBe(75_000);
  });

  it("falls back to legacy price when search_price is unset", () => {
    const result = buildListingPipelineFunnel(
      [{ pipeline_stage: "unconditional", price: 500_000, search_price: null }],
      10,
    );
    const row = result.rows.find((r) => r.stageId === "unconditional");
    expect(row?.totalValue).toBe(500_000);
    expect(row?.projectedGci).toBe(50_000);
  });
});
