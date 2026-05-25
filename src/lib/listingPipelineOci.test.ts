import { describe, expect, it } from "vitest";
import { computeStageOci, formatOciCompact } from "@/lib/listingPipelineOci";

describe("computeStageOci", () => {
  it("sums search price and applies commission rate", () => {
    const result = computeStageOci(
      [
        { price: 500_000, search_price: 800_000 },
        { price: 1_000_000 },
      ],
      2.5,
    );
    expect(result.count).toBe(2);
    expect(result.totalValue).toBe(1_800_000);
    expect(result.oci).toBe(45_000);
  });

  it("returns zero oci for empty stage", () => {
    expect(computeStageOci([], 2.5).oci).toBe(0);
  });
});

describe("formatOciCompact", () => {
  it("formats positive amounts", () => {
    expect(formatOciCompact(105_000)).toMatch(/\$/);
  });

  it("returns dash for zero", () => {
    expect(formatOciCompact(0)).toBe("—");
  });
});
