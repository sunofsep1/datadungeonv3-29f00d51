import { isPast, isToday } from "date-fns";

export type ContactUrgencyTier = "immediate" | "priority" | "planned" | "backlog";

export type ContactUrgencySignals = {
  contactId: string;
  manualTier?: ContactUrgencyTier | null;
  lastActivityAt?: string | null;
  taskDueAts: Array<string | null>;
  sequenceTaskDueAts: Array<string | null>;
  appointmentDates: Array<string | null>;
};

export type ContactUrgencyResult = {
  contactId: string;
  /** Capped at MAX_SCORE for display consistency. */
  score: number;
  tier: ContactUrgencyTier;
  reasons: string[];
};

const MAX_SCORE = 200;

function hoursUntil(value: Date): number {
  return (value.getTime() - Date.now()) / (1000 * 60 * 60);
}

function daysSince(value: Date): number {
  return (Date.now() - value.getTime()) / (1000 * 60 * 60 * 24);
}

export function tierFromScore(score: number): ContactUrgencyTier {
  if (score >= 130) return "immediate";
  if (score >= 80) return "priority";
  if (score >= 35) return "planned";
  return "backlog";
}

export function buildContactUrgency(signals: ContactUrgencySignals): ContactUrgencyResult {
  let score = 0;
  const reasons: string[] = [];

  const taskDates = signals.taskDueAts
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  const sequenceDates = signals.sequenceTaskDueAts
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  const appointmentDates = signals.appointmentDates
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  // ── Overdue tasks → red / immediate ─────────────────────────────────────
  const overdueTasks = taskDates.filter((date) => isPast(date) && !isToday(date));
  if (overdueTasks.length > 0) {
    score += 120 + Math.min(overdueTasks.length * 10, 30);
    reasons.push(`${overdueTasks.length} overdue follow-up task${overdueTasks.length > 1 ? "s" : ""}`);
  }

  // ── Due today → red / immediate ─────────────────────────────────────────
  const dueTodayTasks = taskDates.filter((date) => isToday(date));
  if (dueTodayTasks.length > 0) {
    score += 70 + Math.min(dueTodayTasks.length * 8, 24);
    reasons.push(`${dueTodayTasks.length} follow-up task${dueTodayTasks.length > 1 ? "s" : ""} due today`);
  }

  // ── Due within 30 days → orange / priority ───────────────────────────────
  // (excludes today already counted above; 30 days = 720 hours)
  const dueWithin30Days = taskDates.filter((date) => {
    const hrs = hoursUntil(date);
    return hrs > 0 && hrs <= 720 && !isToday(date);
  });
  if (dueWithin30Days.length > 0) {
    score += 85 + Math.min(dueWithin30Days.length * 5, 15);
    reasons.push(
      `${dueWithin30Days.length} follow-up task${dueWithin30Days.length > 1 ? "s" : ""} due within 30 days`,
    );
  }

  // ── Due within 31–60 days → yellow / planned ─────────────────────────────
  // (1440 hrs = 60 days; exclude the 30-day band above)
  const dueWithin60Days = taskDates.filter((date) => {
    const hrs = hoursUntil(date);
    return hrs > 720 && hrs <= 1440;
  });
  if (dueWithin60Days.length > 0) {
    score += 55 + Math.min(dueWithin60Days.length * 4, 12);
    reasons.push(
      `${dueWithin60Days.length} follow-up task${dueWithin60Days.length > 1 ? "s" : ""} due within 60 days`,
    );
  }

  // ── Due within 61–90 days → yellow (low) / planned ───────────────────────
  // (2160 hrs = 90 days)
  const dueWithin90Days = taskDates.filter((date) => {
    const hrs = hoursUntil(date);
    return hrs > 1440 && hrs <= 2160;
  });
  if (dueWithin90Days.length > 0) {
    score += 38 + Math.min(dueWithin90Days.length * 3, 9);
    reasons.push(
      `${dueWithin90Days.length} follow-up task${dueWithin90Days.length > 1 ? "s" : ""} due within 90 days`,
    );
  }

  // ── Sequence steps due within 24h → priority boost ───────────────────────
  const dueSequenceTasks = sequenceDates.filter((date) => hoursUntil(date) <= 24);
  if (dueSequenceTasks.length > 0) {
    score += 40 + Math.min(dueSequenceTasks.length * 6, 18);
    reasons.push(`nurture sequence action${dueSequenceTasks.length > 1 ? "s" : ""} pending`);
  }

  // ── Appointment window ───────────────────────────────────────────────────
  const nextAppointment = appointmentDates
    .filter((date) => hoursUntil(date) > -2)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (nextAppointment) {
    const hrs = hoursUntil(nextAppointment);
    if (hrs <= 24) {
      score += 55;
      reasons.push("appointment prep window is now");
    } else if (hrs <= 72) {
      score += 30;
      reasons.push("appointment upcoming in 72h");
    }
  }

  // ── Inactivity signals ───────────────────────────────────────────────────
  if (signals.lastActivityAt) {
    const last = new Date(signals.lastActivityAt);
    if (!Number.isNaN(last.getTime())) {
      const inactiveDays = daysSince(last);
      if (inactiveDays >= 30) {
        score += 28;
        reasons.push("no recent contact activity (30+ days)");
      } else if (inactiveDays >= 14) {
        score += 16;
        reasons.push("contact activity is going stale");
      }
    }
  }

  score = Math.min(score, MAX_SCORE);

  const autoTier = tierFromScore(score);
  const tier = signals.manualTier ?? autoTier;
  const minScoreByTier: Record<ContactUrgencyTier, number> = {
    immediate: 130,
    priority: 80,
    planned: 35,
    backlog: 0,
  };

  if (signals.manualTier) {
    score = Math.min(Math.max(score, minScoreByTier[signals.manualTier]), MAX_SCORE);
    reasons.unshift(`manually set to ${signals.manualTier}`);
  }
  return {
    contactId: signals.contactId,
    score,
    tier,
    reasons: reasons.length > 0 ? reasons : ["monitor and continue planned follow-up cadence"],
  };
}
