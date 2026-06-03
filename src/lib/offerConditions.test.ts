import { describe, expect, it } from "vitest";
import {
  buildDefaultConditions,
  computeDepositAmount,
  computeGrossCommission,
  effectiveConditionStatus,
} from "./offerConditions";

describe("offerConditions", () => {
  it("builds default QLD condition due dates from contract date", () => {
    const rows = buildDefaultConditions("2026-05-01");
    expect(rows).toHaveLength(4);
    expect(rows[0]?.due_date).toBe("2026-05-04");
    expect(rows[1]?.due_date).toBe("2026-05-15");
  });

  it("computes percentage deposit", () => {
    expect(computeDepositAmount(1_000_000, "percentage", 10)).toBe(100_000);
  });

  it("computes gross commission inc/ex GST", () => {
    const c = computeGrossCommission(1_000_000, 2.5);
    expect(c.exGst).toBe(25_000);
    expect(c.incGst).toBe(27_500);
  });

  it("flags overdue pending conditions", () => {
    expect(effectiveConditionStatus("pending", "2020-01-01", new Date("2026-05-01"))).toBe("overdue");
    expect(effectiveConditionStatus("complete", "2020-01-01", new Date("2026-05-01"))).toBe("complete");
  });
});
