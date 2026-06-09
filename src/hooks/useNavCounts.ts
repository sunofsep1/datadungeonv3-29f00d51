import { useMemo } from "react";
import { useActiveNurtureEnrollments } from "./useActiveNurtureEnrollments";
import { useAppointments } from "./useAppointments";
import { isPast, isToday } from "date-fns";

/**
 * Returns counts for the global nav heading buttons: Nurture (due steps), Tasks.
 * Used by HeaderBar to show NavHeadingButtons with badges.
 */
export function useNavCounts() {
  const { data: appointments = [] } = useAppointments();
  const { data: nurtureDash } = useActiveNurtureEnrollments();

  const nurtureDueCount = useMemo(
    () => nurtureDash?.summary.dueNow ?? 0,
    [nurtureDash?.summary.dueNow],
  );

  const tasksCount = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.date);
        return isPast(d) && !isToday(d);
      }).length,
    [appointments],
  );

  return { nurtureDueCount, tasksCount };
}
