/**
 * Follow-up cadence by lead temperature (hot/warm/cold).
 * Hot = every week, Warm = every 2 weeks, Cold = every 3 months.
 */
export const FOLLOW_UP_CADENCE_DAYS: Record<string, number> = {
  hot: 7,
  warm: 14,
  cold: 90,
  lead: 90, // treat lead like cold
  qualified: 7,
  customer: 7,
  contacted: 14,
  nurture: 14,
  new: 90,
  unqualified: 90,
};

export type ComingToMarket = "otm" | "4_weeks" | "3_months" | "6_plus";

/** Map "coming to market" to suggested status and cadence days */
export const COMING_TO_MARKET_CADENCE: Record<ComingToMarket, { status: string; days: number }> = {
  otm: { status: "hot", days: 7 },
  "4_weeks": { status: "warm", days: 14 },
  "3_months": { status: "warm", days: 14 },
  "6_plus": { status: "cold", days: 90 },
};

export const COMING_TO_MARKET_LABELS: Record<ComingToMarket, string> = {
  otm: "OTM / Now",
  "4_weeks": "4 weeks",
  "3_months": "3 months",
  "6_plus": "6+ months",
};

/** Resolve status to a kanban-style temperature for cadence (hot/warm/cold/lead) */
export function getTemperature(status: string | null | undefined): "hot" | "warm" | "cold" | "lead" {
  const s = (status ?? "").toLowerCase();
  if (["hot", "qualified", "customer"].includes(s)) return "hot";
  if (["warm", "contacted", "nurture"].includes(s)) return "warm";
  if (["cold", "new", "unqualified"].includes(s)) return "cold";
  return "lead";
}

/** Cadence in days for a contact's status (or coming_to_market if set). */
export function getCadenceDays(
  status: string | null | undefined,
  comingToMarket?: string | null,
  defaultFollowUpDays?: number,
): number {
  if (comingToMarket && comingToMarket in COMING_TO_MARKET_CADENCE) {
    return COMING_TO_MARKET_CADENCE[comingToMarket as ComingToMarket].days;
  }
  const temp = getTemperature(status);
  if (temp === "lead" && defaultFollowUpDays != null && Number.isFinite(defaultFollowUpDays) && defaultFollowUpDays > 0) {
    return defaultFollowUpDays;
  }
  const mapped = FOLLOW_UP_CADENCE_DAYS[temp];
  if (mapped != null) return mapped;
  if (defaultFollowUpDays != null && Number.isFinite(defaultFollowUpDays) && defaultFollowUpDays > 0) {
    return defaultFollowUpDays;
  }
  return 90;
}

/** Next follow-up date from a "last touch" timestamp and cadence days. */
export function getNextFollowUpDate(lastTouch: Date | string | null | undefined, cadenceDays: number): Date {
  const base = lastTouch ? new Date(lastTouch) : new Date(0);
  const next = new Date(base);
  next.setDate(next.getDate() + cadenceDays);
  return next;
}

/** Whether a contact is due for follow-up (next date is in the past or today). */
export function isDueForFollowUp(nextFollowUpAt: Date | string | null | undefined): boolean {
  if (!nextFollowUpAt) return false;
  const d = new Date(nextFollowUpAt);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d.getTime() <= today.getTime();
}

/** Days overdue (positive) or days until due (negative). 0 = due today. */
export function daysUntilDue(nextFollowUpAt: Date | string | null | undefined): number | null {
  if (!nextFollowUpAt) return null;
  const d = new Date(nextFollowUpAt);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
