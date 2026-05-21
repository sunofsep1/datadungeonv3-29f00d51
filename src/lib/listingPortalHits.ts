import { format, startOfMonth, subMonths } from "date-fns";

export type ListingPortalHitRow = {
  id: string;
  listing_id: string;
  hit_month: string;
  portal_key: string | null;
  hit_count: number;
  source: string;
  notes: string | null;
};

export type MonthlyHitsChartPoint = {
  monthKey: string;
  label: string;
  hits: number;
};

/** Normalize to yyyy-MM-01 for storage. */
export function normalizeHitMonth(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return format(startOfMonth(d), "yyyy-MM-dd");
}

/** Build last N months chart points; missing months show 0 hits. */
export function buildMonthlyHitsChart(
  rows: Pick<ListingPortalHitRow, "hit_month" | "hit_count">[],
  months = 12,
  now = new Date(),
): MonthlyHitsChartPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = normalizeHitMonth(row.hit_month);
    totals.set(key, (totals.get(key) ?? 0) + row.hit_count);
  }

  const points: MonthlyHitsChartPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthKey = format(monthStart, "yyyy-MM-dd");
    points.push({
      monthKey,
      label: format(monthStart, "MMM yy"),
      hits: totals.get(monthKey) ?? 0,
    });
  }
  return points;
}

export function totalHitsInPeriod(rows: Pick<ListingPortalHitRow, "hit_count">[]): number {
  return rows.reduce((sum, r) => sum + r.hit_count, 0);
}
