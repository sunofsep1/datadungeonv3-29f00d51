/** Activity schedule helpers (Reapit-style applied templates). */

export type ActivityScheduleAppliesTo = "listing" | "contact";
export type ActivityScheduleStepType = "task" | "note" | "call" | "email";

export function addDaysToIso(base: Date, offsetDays: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.floor(offsetDays)));
  return d.toISOString();
}

export function scheduleProgress(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function stepTypeLabel(type: ActivityScheduleStepType): string {
  const labels: Record<ActivityScheduleStepType, string> = {
    task: "Task",
    note: "Note",
    call: "Call",
    email: "Email",
  };
  return labels[type] ?? type;
}
