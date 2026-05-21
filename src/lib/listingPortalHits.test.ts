import { describe, expect, it } from "vitest";
import { buildMonthlyHitsChart, normalizeHitMonth } from "@/lib/listingPortalHits";

describe("listingPortalHits", () => {
  it("normalizes hit month to first of month", () => {
    expect(normalizeHitMonth("2026-05-15")).toBe("2026-05-01");
  });

  it("aggregates hits by month for chart", () => {
    const chart = buildMonthlyHitsChart(
      [
        { hit_month: "2026-03-01", hit_count: 100 },
        { hit_month: "2026-03-01", hit_count: 50 },
        { hit_month: "2026-04-01", hit_count: 80 },
      ],
      3,
      new Date("2026-05-15"),
    );
    expect(chart).toHaveLength(3);
    expect(chart[0]).toMatchObject({ label: "Mar 26", hits: 150 });
    expect(chart[1]).toMatchObject({ label: "Apr 26", hits: 80 });
    expect(chart[2]).toMatchObject({ label: "May 26", hits: 0 });
  });
});
