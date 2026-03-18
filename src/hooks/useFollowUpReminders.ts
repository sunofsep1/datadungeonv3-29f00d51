import { useMemo } from "react";
import {
  getCadenceDays,
  getTemperature,
  isDueForFollowUp,
  getNextFollowUpDate,
  daysUntilDue,
} from "@/lib/followUpCadence";
import type { ContactWithMeta } from "./useContacts";

export type ContactDueForFollowUp = ContactWithMeta & {
  nextFollowUpAt: Date;
  due: boolean;
  daysUntilDue: number | null;
  temperature: "hot" | "warm" | "cold" | "lead";
  cadenceDays: number;
};

/**
 * From contacts list, compute who is due for follow-up based on status/coming_to_market
 * and last_activity_at or next_follow_up_at. Excludes contacts without a follow-up temperature (e.g. no status).
 */
export function useContactsDueForFollowUp(contacts: ContactWithMeta[] | undefined): ContactDueForFollowUp[] {
  return useMemo(() => {
    if (!contacts?.length) return [];

    const now = new Date();
    const result: ContactDueForFollowUp[] = [];

    for (const c of contacts) {
      const status = c.status ?? "lead";
      const temperature = getTemperature(status);
      const cadenceDays = getCadenceDays(status, (c as { coming_to_market?: string | null }).coming_to_market);

      // Prefer next_follow_up_at; else derive from last_activity_at or updated_at or created_at
      const lastTouch =
        (c as { last_activity_at?: string | null }).last_activity_at ||
        c.updated_at ||
        c.created_at ||
        null;
      const storedNext = (c as { next_follow_up_at?: string | null }).next_follow_up_at;
      const nextFollowUpAt = storedNext
        ? new Date(storedNext)
        : getNextFollowUpDate(lastTouch, cadenceDays);

      const due = isDueForFollowUp(nextFollowUpAt);
      const days = daysUntilDue(nextFollowUpAt);

      result.push({
        ...c,
        nextFollowUpAt,
        due,
        daysUntilDue: days,
        temperature,
        cadenceDays,
      } as ContactDueForFollowUp);
    }

    // Sort: due first (overdue by most days), then by next follow-up ascending
    result.sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1;
      const daysA = a.daysUntilDue ?? 999;
      const daysB = b.daysUntilDue ?? 999;
      return daysA - daysB; // most overdue first (largest positive), then soonest due
    });

    return result;
  }, [contacts]);
}

/** Contacts that are due (overdue or due today). */
export function useContactsDueNow(contacts: ContactWithMeta[] | undefined): ContactDueForFollowUp[] {
  const all = useContactsDueForFollowUp(contacts);
  return useMemo(() => all.filter((c) => c.due), [all]);
}

/** Group due contacts by temperature (hot, warm, cold). */
export function useFollowUpByTemperature(
  contacts: ContactWithMeta[] | undefined
): { hot: ContactDueForFollowUp[]; warm: ContactDueForFollowUp[]; cold: ContactDueForFollowUp[] } {
  const dueList = useContactsDueForFollowUp(contacts);
  return useMemo(() => {
    const hot: ContactDueForFollowUp[] = [];
    const warm: ContactDueForFollowUp[] = [];
    const cold: ContactDueForFollowUp[] = [];
    for (const c of dueList) {
      if (c.temperature === "hot") hot.push(c);
      else if (c.temperature === "warm") warm.push(c);
      else cold.push(c);
    }
    return { hot, warm, cold };
  }, [dueList]);
}
