import { describe, expect, it } from "vitest";
import {
  calculateListingCommission,
  allocateCommissionSplits,
  commissionSalePriceFromOffers,
  isListingCommissionUnlocked,
  totalSplitPct,
} from "@/lib/listingCommission";

describe("listingCommission", () => {
  it("calculates inc/ex GST commission", () => {
    const totals = calculateListingCommission({ salePrice: 1_000_000, grossCommissionPct: 2.5 });
    expect(totals.grossExGst).toBe(25_000);
    expect(totals.gstAmount).toBe(2_500);
    expect(totals.grossIncGst).toBe(27_500);
  });

  it("allocates splits from gross inc GST", () => {
    const totals = calculateListingCommission({ salePrice: 1_000_000, grossCommissionPct: 2 });
    const rows = allocateCommissionSplits(totals, [
      { id: "1", agent_name: "Ann", split_pct: 60 },
      { id: "2", agent_name: "Ben", split_pct: 40 },
    ]);
    expect(rows[0].amountExGst).toBe(12_000);
    expect(rows[0].amountIncGst).toBe(13_200);
    expect(totalSplitPct(rows)).toBe(100);
  });

  it("unlocks on conditional offer", () => {
    expect(isListingCommissionUnlocked([{ status: "submitted" }], "listing")).toBe(false);
    expect(isListingCommissionUnlocked([{ status: "conditional" }], "listing")).toBe(true);
  });

  it("prefers contract offer price", () => {
    const price = commissionSalePriceFromOffers(
      [
        { status: "submitted", offer_price: 900_000 },
        { status: "conditional", offer_price: 880_000 },
      ],
      850_000,
    );
    expect(price).toBe(880_000);
  });
});
