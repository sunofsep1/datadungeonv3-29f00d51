import { describe, expect, it } from "vitest";
import { computeTotals } from "./invoiceTotals";

describe("computeTotals", () => {
  it("none mode — $500 reimbursement", () => {
    const t = computeTotals([{ quantity: 1, unit_price: 500 }], "none");
    expect(t.subtotal).toBe(500);
    expect(t.gstAmount).toBeNull();
    expect(t.total).toBe(500);
  });

  it("inclusive mode — $1,280 with GST component ~116.36", () => {
    const t = computeTotals(
      [{ quantity: 1, unit_price: 1280, gst_rate: 10 }],
      "inclusive",
    );
    expect(t.total).toBe(1280);
    expect(t.gstAmount).toBe(116.36);
    expect(t.subtotal).toBe(1163.64);
  });

  it("exclusive mode — adds GST on top", () => {
    const t = computeTotals(
      [{ quantity: 1, unit_price: 100, gst_rate: 10 }],
      "exclusive",
    );
    expect(t.subtotal).toBe(100);
    expect(t.gstAmount).toBe(10);
    expect(t.total).toBe(110);
  });
});
