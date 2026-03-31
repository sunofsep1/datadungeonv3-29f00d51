import { isPast, isToday } from "date-fns";

export type ContactUrgencyTier = "immediate" | "priority" | "planned" | "backlog";

export type ContactUrgencySignals = {
  contactId: string;
  lastActivityAt?: string | null;
  taskDueAts: Array<string | null>;
  sequenceTaskDueAts: Array<string | null>;
  appointmentDates: Array<string | null>;
};

export type ContactUrgencyResult = {
  contactId: string;
  score: number;
  tier: ContactUrgencyTier;
  reasons: string[];
};

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

  const overdueTasks = taskDates.filter((date) => isPast(date) && !isToday(date));
  if (overdueTasks.length > 0) {
    score += 120 + Math.min(overdueTasks.length * 10, 30);
    reasons.push(`${overdueTasks.length} overdue follow-up task${overdueTasks.length > 1 ? "s" : ""}`);
  }

  const dueTodayTasks = taskDates.filter((date) => isToday(date));
  if (dueTodayTasks.length > 0) {
    score += 70 + Math.min(dueTodayTasks.length * 8, 24);
    reasons.push(`${dueTodayTasks.length} follow-up task${dueTodayTasks.length > 1 ? "s" : ""} due today`);
  }

  const dueSoonTasks = taskDates.filter((date) => {
    const hrs = hoursUntil(date);
    return hrs > 0 && hrs <= 48;
  });
  if (dueSoonTasks.length > 0) {
    score += 45 + Math.min(dueSoonTasks.length * 5, 15);
    reasons.push(`${dueSoonTasks.length} task${dueSoonTasks.length > 1 ? "s" : ""} due within 48h`);
  }

  const dueSequenceTasks = sequenceDates.filter((date) => hoursUntil(date) <= 24);
  if (dueSequenceTasks.length > 0) {
    score += 40 + Math.min(dueSequenceTasks.length * 6, 18);
    reasons.push(`nurture sequence action${dueSequenceTasks.length > 1 ? "s" : ""} pending`);
  }

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

  const tier = tierFromScore(score);
  return {
    contactId: signals.contactId,
    score,
    tier,
    reasons: reasons.length > 0 ? reasons : ["monitor and continue planned follow-up cadence"],
  };
}
