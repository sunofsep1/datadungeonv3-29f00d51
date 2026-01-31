import { useMemo } from "react";
import { useContacts } from "./useContacts";
import { useAppointments } from "./useAppointments";
import { isPast, isToday } from "date-fns";

/**
 * Returns counts for the global nav heading buttons: Hot Leads, Recent, Tasks.
 * Used by HeaderBar to show NavHeadingButtons with badges.
 */
export function useNavCounts() {
  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();

  const hotLeadsCount = useMemo(
    () => contacts.filter((c) => (c.status ?? "lead") === "hot").length,
    [contacts]
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

  return { hotLeadsCount, recentCount, tasksCount };
}
