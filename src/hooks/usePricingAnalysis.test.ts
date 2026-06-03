import { describe, expect, it } from "vitest";
import { buildBracketRows, pickSuggestedBracketLow } from "./usePricingAnalysis";
import type { Database } from "@/integrations/supabase/types";

type BracketRow = Database["public"]["Tables"]["price_brackets"]["Row"];

function mockBracket(
  low: number,
  high: number,
  supply: number,
  demand: number,
  score: number | null
): BracketRow {
  return {
    id: crypto.randomUUID(),
    analysis_id: "a",
    bracket_low: low,
    bracket_high: high,
    active_supply: supply,
    recent_demand: demand,
    opportunity_score: score,
  };
}

describe("buildBracketRows", () => {
  it("creates 25k steps across TAM", () => {
    const rows = buildBracketRows(450_000, 550_000, 25_000);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ bracket_low: 450_000, bracket_high: 475_000 });
    expect(rows[3]).toEqual({ bracket_low: 525_000, bracket_high: 550_000 });
  });

  it("returns empty for invalid input", () => {
    expect(buildBracketRows(500_000, 400_000, 25_000)).toEqual([]);
    expect(buildBracketRows(400_000, 500_000, 0)).toEqual([]);
  });
});

describe("pickSuggestedBracketLow", () => {
  it("picks highest opportunity score then demand", () => {
    const rows: BracketRow[] = [
      mockBracket(400_000, 425_000, 2, 4, 2),
      mockBracket(425_000, 450_000, 1, 6, 6),
      mockBracket(450_000, 475_000, 0, 3, 3),
    ];
    expect(pickSuggestedBracketLow(rows)).toBe(425_000);
  });

  it("returns null when empty", () => {
    expect(pickSuggestedBracketLow([])).toBeNull();
  });
});
