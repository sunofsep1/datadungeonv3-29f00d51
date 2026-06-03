import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";

export type OfferConditionType =
  | "initial_deposit"
  | "finance"
  | "building_pest"
  | "balance_of_deposit"
  | "title_search"
  | "strata_report"
  | "other";

export type OfferConditionStatus = "pending" | "complete" | "overdue" | "waived";

export type OfferCondition = {
  id: string;
  offer_id: string;
  listing_id: string;
  user_id: string;
  condition_type: OfferConditionType;
  label: string;
  due_date: string;
  status: OfferConditionStatus;
  notes: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const OFFER_CONDITION_TYPE_LABELS: Record<OfferConditionType, string> = {
  initial_deposit: "Initial deposit",
  finance: "Finance approval",
  building_pest: "Building & pest",
  balance_of_deposit: "Balance of deposit",
  title_search: "Title search",
  strata_report: "Strata report",
  other: "Other",
};

export const DEFAULT_QLD_CONDITION_OFFSETS: Array<{
  condition_type: OfferConditionType;
  label: string;
  offsetDays: number;
}> = [
  { condition_type: "initial_deposit", label: "Initial deposit", offsetDays: 3 },
  { condition_type: "finance", label: "Finance approval", offsetDays: 14 },
  { condition_type: "building_pest", label: "Building & pest inspection", offsetDays: 14 },
  { condition_type: "balance_of_deposit", label: "Balance of deposit", offsetDays: 21 },
];

export function isContractOfferStatus(status: string): boolean {
  return ["accepted", "conditional", "unconditional", "settled"].includes(status);
}

export function effectiveConditionStatus(
  status: OfferConditionStatus,
  dueDateIso: string,
  asOf: Date = new Date(),
): OfferConditionStatus {
  if (status === "complete" || status === "waived") return status;
  const due = startOfDay(parseISO(`${dueDateIso.slice(0, 10)}T12:00:00`));
  const today = startOfDay(asOf);
  return due < today ? "overdue" : "pending";
}

export function conditionStatusLabel(status: OfferConditionStatus): string {
  if (status === "overdue") return "Overdue";
  if (status === "complete") return "Complete";
  if (status === "waived") return "Waived";
  return "Pending";
}

export function conditionStatusClass(status: OfferConditionStatus): string {
  if (status === "overdue") return "bg-destructive/10 text-destructive border-destructive/30";
  if (status === "complete") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (status === "waived") return "bg-muted text-muted-foreground border-border";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
}

export function buildDefaultConditions(
  contractDateIso: string,
): Array<{ condition_type: OfferConditionType; label: string; due_date: string; sort_order: number }> {
  const anchor = parseISO(`${contractDateIso.slice(0, 10)}T12:00:00`);
  return DEFAULT_QLD_CONDITION_OFFSETS.map((row, i) => ({
    condition_type: row.condition_type,
    label: row.label,
    due_date: format(addDays(anchor, row.offsetDays), "yyyy-MM-dd"),
    sort_order: i,
  }));
}

export function computeDepositAmount(
  offerPrice: number,
  depositType: "percentage" | "flat",
  depositAmount: number | null | undefined,
): number | null {
  if (depositAmount == null || !Number.isFinite(depositAmount)) return null;
  if (depositType === "percentage") return Math.round(offerPrice * (depositAmount / 100) * 100) / 100;
  return depositAmount;
}

export function computeGrossCommission(
  contractPrice: number,
  commissionPct: number,
): { incGst: number; exGst: number } {
  const exGst = Math.round(contractPrice * (commissionPct / 100) * 100) / 100;
  const incGst = Math.round(exGst * 1.1 * 100) / 100;
  return { incGst, exGst };
}

export type OfferConditionDueRow = {
  listingId: string;
  address: string;
  conditionLabel: string;
  dueDateIso: string;
  dueDateLabel: string;
  daysUntil: number;
  contractDateLabel: string;
  status: OfferConditionStatus;
  offerRef?: string | null;
};

/** Contract conditions due — sourced from offer_conditions rows on active contracts. */
export function buildOfferConditionsDueReport(
  conditions: OfferCondition[],
  addressByListingId: Map<string, string>,
  offerRefByOfferId: Map<string, string>,
  options: { withinDays?: number; includeOverdue?: boolean; includeComplete?: boolean } = {},
  asOf: Date = new Date(),
): OfferConditionDueRow[] {
  const withinDays = options.withinDays ?? 30;
  const includeOverdue = options.includeOverdue !== false;
  const includeComplete = options.includeComplete === true;
  const today = startOfDay(asOf);
  const rows: OfferConditionDueRow[] = [];

  for (const cond of conditions) {
    if (!includeComplete && (cond.status === "complete" || cond.status === "waived")) continue;
    const effective = effectiveConditionStatus(cond.status, cond.due_date, asOf);
    if (!includeComplete && (effective === "complete" || effective === "waived")) continue;

    const due = startOfDay(parseISO(`${cond.due_date.slice(0, 10)}T12:00:00`));
    const daysUntil = differenceInCalendarDays(due, today);
    if (!includeOverdue && daysUntil < 0) continue;
    if (daysUntil > withinDays) continue;

    rows.push({
      listingId: cond.listing_id,
      address: addressByListingId.get(cond.listing_id) ?? "Listing",
      conditionLabel: cond.label,
      dueDateIso: cond.due_date.slice(0, 10),
      dueDateLabel: format(due, "d MMM yyyy"),
      daysUntil,
      contractDateLabel: "—",
      status: effective,
      offerRef: offerRefByOfferId.get(cond.offer_id) ?? null,
    });
  }

  return rows.sort(
    (a, b) =>
      a.daysUntil - b.daysUntil ||
      a.dueDateIso.localeCompare(b.dueDateIso) ||
      a.address.localeCompare(b.address),
  );
}
