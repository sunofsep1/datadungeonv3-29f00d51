import { differenceInCalendarDays } from "date-fns";

/** Minimal contact shape for last-touch math (list rows, dashboard counts). */
export type ContactLikeForTouch = {
  last_touch_date?: string | null;
  last_activity_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export function getLastTouchDate(contact: ContactLikeForTouch): Date | null {
  const values = [
    contact.last_touch_date,
    contact.last_activity_at,
    contact.updated_at,
    contact.created_at,
  ].filter(Boolean) as string[];
  let latest: Date | null = null;
  for (const value of values) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) continue;
    if (!latest || parsed.getTime() > latest.getTime()) latest = parsed;
  }
  return latest;
}

export function getDaysSinceLastTouch(contact: ContactLikeForTouch): number | null {
  const lastTouch = getLastTouchDate(contact);
  if (!lastTouch) return null;
  return Math.max(0, differenceInCalendarDays(new Date(), lastTouch));
}
