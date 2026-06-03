import { useMemo } from "react";
import { useContacts } from "./useContacts";
import { useAppointments } from "./useAppointments";
import { useActiveNurtureEnrollments } from "./useActiveNurtureEnrollments";
import { isPast, isToday } from "date-fns";

/**
 * Returns counts for the global nav heading buttons: Nurture (due steps), Recent, Tasks.
 * Used by HeaderBar to show NavHeadingButtons with badges.
 */
export function useNavCounts() {
  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();
  const { data: nurtureDash } = useActiveNurtureEnrollments();

  const nurtureDueCount = useMemo(
    () => nurtureDash?.summary.dueNow ?? 0,
    [nurtureDash?.summary.dueNow]
  );

  const recentCount = useMemo(() => {
    const items: { date: Date }[] = [];
    contacts.slice(0, 20).forEach((c) => {
      items.push({ date: new Date(c.created_at) });
    });
    appointments.slice(0, 20).forEach((a) => {
      items.push({ date: new Date(a.date) });
    });
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 30).length;
  }, [contacts, appointments]);

  const tasksCount = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.date);
        return isPast(d) && !isToday(d);
      }).length,
    [appointments]
  );

  return { nurtureDueCount, recentCount, tasksCount };
}
