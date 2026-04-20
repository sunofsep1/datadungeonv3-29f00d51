import { differenceInCalendarDays, startOfDay } from "date-fns";

type WithDob = { date_of_birth?: string | null };

/**
 * Calendar days until the next occurrence of the birthday (month/day), from `from`'s calendar date.
 * Returns 0 if birthday is today. Null if DOB missing or invalid.
 *
 * Uses the **host local calendar** (`startOfDay` / `Date` in the runtime timezone). Date-only strings
 * are anchored at local noon (`T12:00:00`) to reduce UTC boundary skew for `YYYY-MM-DD` inputs.
 */
export function daysUntilNextBirthday(
  dateOfBirth: string | null | undefined,
  from: Date = new Date(),
): number | null {
  if (!dateOfBirth || !String(dateOfBirth).trim()) return null;
  const born = new Date(`${String(dateOfBirth).trim()}T12:00:00`);
  if (Number.isNaN(born.getTime())) return null;

  const today = startOfDay(from);
  const y = today.getFullYear();
  let next = new Date(y, born.getMonth(), born.getDate(), 12, 0, 0);
  if (next < today) {
    next = new Date(y + 1, born.getMonth(), born.getDate(), 12, 0, 0);
  }
  return differenceInCalendarDays(next, today);
}

export function isBirthdayWithinDays(contact: WithDob, maxDaysInclusive: number, from: Date = new Date()): boolean {
  const d = daysUntilNextBirthday(contact.date_of_birth, from);
  if (d == null) return false;
  return d >= 0 && d <= maxDaysInclusive;
}
