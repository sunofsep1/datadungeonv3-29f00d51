import { isSameDay, startOfDay } from "date-fns";

/**
 * Parse a task start date (YYYY-MM-DD or ISO timestamp) into local calendar noon.
 * Bucketing uses the calendar date only — the date you pick is when work starts.
 */
export function parseDateOnlyLocal(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const datePart = raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (datePart) {
    const d = new Date(`${datePart}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

/** Store a `<input type="date">` value as ISO (local noon on that calendar day). */
export function isoFromDateInput(dateValue: string): string | null {
  const d = parseDateOnlyLocal(dateValue);
  return d?.toISOString() ?? null;
}

export function isDueToday(dueAt: Date | null | undefined): boolean {
  if (!dueAt) return false;
  return isSameDay(dueAt, new Date());
}

export function isDueOverdue(dueAt: Date | null | undefined): boolean {
  if (!dueAt) return false;
  return startOfDay(dueAt) < startOfDay(new Date());
}

/** Today's date as YYYY-MM-DD for date inputs. */
export function todayDateInputValue(from: Date = new Date()): string {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, "0");
  const d = String(from.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
