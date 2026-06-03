import { describe, expect, it } from "vitest";
import { summarizeMarketingFunds } from "@/lib/listingMarketingFunds";

describe("listingMarketingFunds", () => {
  it("computes balance and overspend", () => {
    const summary = summarizeMarketingFunds(
      [{ approved_amount: 5000, received_amount: 4000 }],
      [{ cost: 1200, office_paid: 0, agent_paid: 0, vendor_paid: 1200 }],
    );
    expect(summary.totalReceived).toBe(4000);
    expect(summary.totalExpenses).toBe(1200);
    expect(summary.balance).toBe(2800);
    expect(summary.overspent).toBe(false);
  });

  it("flags overspend", () => {
    const summary = summarizeMarketingFunds(
      [{ approved_amount: 1000, received_amount: 1000 }],
      [{ cost: 1500, office_paid: 500, agent_paid: 500, vendor_paid: 500 }],
    );
    expect(summary.balance).toBe(-500);
    expect(summary.overspent).toBe(true);
  });
});
