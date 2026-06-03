import { describe, expect, it } from "vitest";
import { summarizeUsageRows } from "./aiUsageSummary";

describe("summarizeUsageRows", () => {
  it("aggregates spend/tokens and groups by model", () => {
    const rows = [
      { usage_date: "2026-04-20", model: "claude-sonnet", total_tokens: 1000, cost_usd: 0.5 },
      { usage_date: "2026-04-20", model: "claude-sonnet", total_tokens: 500, cost_usd: 0.2 },
      { usage_date: "2026-04-19", model: "claude-opus", total_tokens: 2000, cost_usd: 1.4 },
    ];

    const out = summarizeUsageRows(rows, new Date("2026-04-20T12:00:00Z"));
    expect(out.spendToday).toBeCloseTo(0.7, 5);
    expect(out.spendPeriod).toBeCloseTo(2.1, 5);
    expect(out.totalTokens).toBe(3500);
    expect(out.modelsUsed).toBe(2);
    expect(out.byModel[0]).toEqual({ model: "claude-opus", spend: 1.4, tokens: 2000 });
    expect(out.byModel[1]).toEqual({ model: "claude-sonnet", spend: 0.7, tokens: 1500 });
  });
});
