import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  effectiveConditionStatus,
  type OfferCondition,
  type OfferConditionStatus,
} from "@/lib/offerConditions";

export type ContractTimelineMilestoneKind =
  | "contract"
  | "condition"
  | "unconditional"
  | "settlement";

export type ContractTimelinePhase = "conditional" | "unconditional";

export type ContractTimelineMilestone = {
  id: string;
  label: string;
  dateIso: string;
  dateLabel: string;
  weekdayLabel: string;
  dayOfContract: number;
  daysUntilSettlement: number;
  relativeLabel: string;
  phase: ContractTimelinePhase;
  kind: ContractTimelineMilestoneKind;
  /** 0–100 position along contract → settlement span */
  position: number;
  conditionStatus?: OfferConditionStatus;
  /** 1-based contract week (days 1–7 = week 1, etc.) */
  weekOfContract: number;
};

export type ContractTimelineWeek = {
  weekNumber: number;
  label: string;
  shortLabel: string;
  startDayOfContract: number;
  endDayOfContract: number;
  startDateIso: string;
  endDateIso: string;
  startWeekdayLabel: string;
  endWeekdayLabel: string;
  startPosition: number;
  endPosition: number;
  centerPosition: number;
  milestoneIds: string[];
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
  phase: ContractTimelinePhase;
};

export type ContractTimelineModel = {
  startDateIso: string;
  endDateIso: string;
  startLabel: string;
  endLabel: string;
  startWeekdayLabel: string;
  endWeekdayLabel: string;
  todayWeekdayLabel: string;
  unconditionalDateIso: string | null;
  totalDays: number;
  elapsedDays: number;
  /** Calendar progress from contract to settlement (0–100) */
  progressPercent: number;
  todayPosition: number;
  isComplete: boolean;
  isPreStart: boolean;
  isUnconditionalPhase: boolean;
  milestones: ContractTimelineMilestone[];
  weeks: ContractTimelineWeek[];
};

type ContractTimelineOffer = {
  exchange_date: string | null;
  settlement_date?: string | null;
  expected_settlement_date?: string | null;
  expected_unconditional_date?: string | null;
  status?: string | null;
};

function parseContractDay(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  try {
    return startOfDay(parseISO(`${iso.slice(0, 10)}T12:00:00`));
  } catch {
    return null;
  }
}

function formatContractDay(date: Date): string {
  return format(date, "d MMM yyyy");
}

/** Weekday + date for timeline display — e.g. Mon, 18 May 2026 */
export function formatContractWeekday(iso: string | null | undefined): string {
  const date = parseContractDay(iso);
  if (!date) return "—";
  return format(date, "EEE, d MMM yyyy");
}

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function positionOnSpan(date: Date, start: Date, end: Date): number {
  const total = differenceInCalendarDays(end, start);
  if (total <= 0) return date >= end ? 100 : 0;
  const offset = differenceInCalendarDays(date, start);
  return Math.min(100, Math.max(0, (offset / total) * 100));
}

export function contractWeekNumber(dayOfContract: number): number {
  return Math.max(1, Math.ceil(dayOfContract / 7));
}

function buildContractWeeks(
  contract: Date,
  settlement: Date,
  totalDays: number,
  milestones: ContractTimelineMilestone[],
  unconditional: Date | null,
  today: Date,
): ContractTimelineWeek[] {
  const weekCount = Math.max(1, Math.ceil((totalDays + 1) / 7));
  const weeks: ContractTimelineWeek[] = [];

  for (let weekNumber = 1; weekNumber <= weekCount; weekNumber++) {
    const startDayOfContract = (weekNumber - 1) * 7 + 1;
    const endDayOfContract = Math.min(weekNumber * 7, totalDays + 1);
    const startDate = addDays(contract, startDayOfContract - 1);
    const endDate = addDays(contract, endDayOfContract - 1);
    const midpoint = addDays(contract, startDayOfContract - 1 + Math.floor((endDayOfContract - startDayOfContract) / 2));
    const phase: ContractTimelinePhase =
      unconditional && midpoint >= unconditional ? "unconditional" : "conditional";
    const milestoneIds = milestones
      .filter((m) => m.weekOfContract === weekNumber)
      .map((m) => m.id);
    const isPast = today > endDate;
    const isFuture = today < startDate;
    const isCurrent = !isPast && !isFuture;

    weeks.push({
      weekNumber,
      label: `Week ${weekNumber}`,
      shortLabel: `Wk ${weekNumber}`,
      startDayOfContract,
      endDayOfContract,
      startDateIso: toIso(startDate),
      endDateIso: toIso(endDate),
      startWeekdayLabel: format(startDate, "d MMM"),
      endWeekdayLabel: format(endDate, "d MMM"),
      startPosition: positionOnSpan(startDate, contract, settlement),
      endPosition: positionOnSpan(endDate, contract, settlement),
      centerPosition: positionOnSpan(midpoint, contract, settlement),
      milestoneIds,
      isCurrent,
      isPast,
      isFuture,
      phase,
    });
  }

  return weeks;
}

function relativeDayLabel(date: Date, today: Date): string {
  const diff = differenceInCalendarDays(date, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

function enrichMilestone(
  milestone: Omit<
    ContractTimelineMilestone,
    "weekdayLabel" | "dayOfContract" | "daysUntilSettlement" | "relativeLabel" | "phase" | "weekOfContract"
  >,
  contract: Date,
  settlement: Date,
  unconditional: Date | null,
  today: Date,
): ContractTimelineMilestone {
  const date = parseContractDay(milestone.dateIso)!;
  const dayOfContract = differenceInCalendarDays(date, contract) + 1;
  const daysUntilSettlement = differenceInCalendarDays(settlement, date);
  const phase: ContractTimelinePhase =
    unconditional && date >= unconditional ? "unconditional" : "conditional";

  return {
    ...milestone,
    weekdayLabel: format(date, "EEE, d MMM yyyy"),
    dayOfContract,
    daysUntilSettlement,
    relativeLabel: relativeDayLabel(date, today),
    phase,
    weekOfContract: contractWeekNumber(dayOfContract),
  };
}

function addMilestone(
  list: Array<
    Omit<
      ContractTimelineMilestone,
      "weekdayLabel" | "dayOfContract" | "daysUntilSettlement" | "relativeLabel" | "phase" | "weekOfContract"
    > & { date: Date }
  >,
  seen: Set<string>,
  milestone: Omit<
    ContractTimelineMilestone,
    | "position"
    | "weekdayLabel"
    | "dayOfContract"
    | "daysUntilSettlement"
    | "relativeLabel"
    | "phase"
    | "weekOfContract"
  > & { date: Date },
  start: Date,
  end: Date,
) {
  const key = `${milestone.kind}:${milestone.dateIso}`;
  if (seen.has(key)) return;
  seen.add(key);
  list.push({
    ...milestone,
    position: positionOnSpan(milestone.date, start, end),
  });
}

/** Build visual contract timeline from offer dates and condition rows. */
export function buildContractTimeline(
  offer: ContractTimelineOffer,
  conditions: Pick<OfferCondition, "id" | "label" | "due_date" | "status">[],
  asOf: Date = new Date(),
): ContractTimelineModel | null {
  const settlement =
    parseContractDay(offer.expected_settlement_date) ??
    parseContractDay(offer.settlement_date);

  const contract =
    parseContractDay(offer.exchange_date) ??
    (conditions.length
      ? conditions
          .map((c) => parseContractDay(c.due_date))
          .filter((d): d is Date => d != null)
          .sort((a, b) => a.getTime() - b.getTime())[0] ?? null
      : null);

  if (!contract || !settlement) return null;
  if (settlement < contract) return null;

  const today = startOfDay(asOf);
  const unconditional = parseContractDay(offer.expected_unconditional_date);
  const totalDays = Math.max(1, differenceInCalendarDays(settlement, contract));
  const elapsedDays = differenceInCalendarDays(today, contract);
  const progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  const todayPosition = positionOnSpan(today, contract, settlement);
  const isUnconditionalPhase = unconditional != null && today >= unconditional;

  const rawMilestones: Array<
    Omit<
      ContractTimelineMilestone,
      "weekdayLabel" | "dayOfContract" | "daysUntilSettlement" | "relativeLabel" | "phase" | "weekOfContract"
    > & { date: Date }
  > = [];
  const seen = new Set<string>();

  addMilestone(
    rawMilestones,
    seen,
    {
      id: "contract",
      label: "Contract / exchange",
      dateIso: toIso(contract),
      dateLabel: formatContractDay(contract),
      kind: "contract",
      date: contract,
    },
    contract,
    settlement,
  );

  for (const cond of [...conditions].sort((a, b) => a.due_date.localeCompare(b.due_date))) {
    const due = parseContractDay(cond.due_date);
    if (!due) continue;
    addMilestone(
      rawMilestones,
      seen,
      {
        id: cond.id,
        label: cond.label,
        dateIso: toIso(due),
        dateLabel: formatContractDay(due),
        kind: "condition",
        conditionStatus: effectiveConditionStatus(cond.status, cond.due_date, asOf),
        date: due,
      },
      contract,
      settlement,
    );
  }

  if (unconditional) {
    addMilestone(
      rawMilestones,
      seen,
      {
        id: "unconditional",
        label: offer.status === "unconditional" ? "Unconditional" : "Expected unconditional",
        dateIso: toIso(unconditional),
        dateLabel: formatContractDay(unconditional),
        kind: "unconditional",
        date: unconditional,
      },
      contract,
      settlement,
    );
  }

  addMilestone(
    rawMilestones,
    seen,
    {
      id: "settlement",
      label: "Settlement",
      dateIso: toIso(settlement),
      dateLabel: formatContractDay(settlement),
      kind: "settlement",
      date: settlement,
    },
    contract,
    settlement,
  );

  const milestones = rawMilestones
    .sort((a, b) => a.position - b.position)
    .map((m) => enrichMilestone(m, contract, settlement, unconditional, today));

  const weeks = buildContractWeeks(contract, settlement, totalDays, milestones, unconditional, today);

  return {
    startDateIso: toIso(contract),
    endDateIso: toIso(settlement),
    startLabel: formatContractDay(contract),
    endLabel: formatContractDay(settlement),
    startWeekdayLabel: format(contract, "EEE, d MMM yyyy"),
    endWeekdayLabel: format(settlement, "EEE, d MMM yyyy"),
    todayWeekdayLabel: format(today, "EEE, d MMM yyyy"),
    unconditionalDateIso: unconditional ? toIso(unconditional) : null,
    totalDays,
    elapsedDays,
    progressPercent,
    todayPosition,
    isComplete: today >= settlement,
    isPreStart: today < contract,
    isUnconditionalPhase,
    milestones,
    weeks,
  };
}

export function contractTimelineProgressLabel(model: ContractTimelineModel): string {
  if (model.isPreStart) {
    const days = Math.abs(model.elapsedDays);
    return `Starts in ${days} day${days === 1 ? "" : "s"}`;
  }
  if (model.isComplete) {
    return "Settlement reached";
  }
  const remaining = model.totalDays - model.elapsedDays;
  return `Day ${Math.max(1, model.elapsedDays + 1)} of ${model.totalDays + 1} · ${remaining} day${remaining === 1 ? "" : "s"} to settlement`;
}

export function contractTimelinePhaseSummary(model: ContractTimelineModel, asOf: Date = new Date()): string {
  if (model.isPreStart) return "Pre-contract";
  if (model.isComplete) return "Settled";

  const today = startOfDay(asOf);

  if (model.isUnconditionalPhase) {
    const settlement = parseContractDay(model.endDateIso);
    if (!settlement) return "Unconditional period";
    const days = differenceInCalendarDays(settlement, today);
    return `Unconditional period · ${Math.max(0, days)} day${days === 1 ? "" : "s"} to settlement`;
  }

  if (model.unconditionalDateIso) {
    const unconditional = parseContractDay(model.unconditionalDateIso);
    if (unconditional) {
      const days = differenceInCalendarDays(unconditional, today);
      if (days >= 0) {
        return `Conditional period · ${days} day${days === 1 ? "" : "s"} until unconditional`;
      }
    }
  }

  return "Conditional period";
}

export function contractMilestoneDetailLine(milestone: ContractTimelineMilestone): string {
  const parts = [
    `Week ${milestone.weekOfContract}`,
    milestone.weekdayLabel,
    `Day ${milestone.dayOfContract}`,
    milestone.daysUntilSettlement >= 0
      ? `${milestone.daysUntilSettlement} day${milestone.daysUntilSettlement === 1 ? "" : "s"} to settlement`
      : `${Math.abs(milestone.daysUntilSettlement)} day${Math.abs(milestone.daysUntilSettlement) === 1 ? "" : "s"} past settlement`,
  ];
  return parts.join(" · ");
}

export function contractWeekDetailLine(week: ContractTimelineWeek): string {
  return `${week.label} · Days ${week.startDayOfContract}–${week.endDayOfContract} · ${week.startWeekdayLabel} – ${week.endWeekdayLabel}`;
}
