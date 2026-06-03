import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useAppointmentsByContact } from "@/hooks/useAppointments";

interface ContactActivitySummaryStripProps {
  contactId: string | null;
}

/** Compact line for collapsed activity expandable — uses same sources as ActivityTimeline. */
export function ContactActivitySummaryStrip({ contactId }: ContactActivitySummaryStripProps) {
  const filters = { contactId };
  const { data: activities = [], isLoading } = useActivityLog({ ...filters, limit: 120 });
  const { data: appointments = [] } = useAppointmentsByContact(contactId, 120);

  const { count, lastLabel } = useMemo(() => {
    const n = activities.length + appointments.length;
    const times: { t: number; label: string }[] = [];
    activities.forEach((a) => {
      times.push({ t: new Date(a.occurred_at).getTime(), label: a.activity_type.replace(/_/g, " ") });
    });
    appointments.forEach((apt) => {
      times.push({ t: new Date(apt.date).getTime(), label: "appointment" });
    });
    times.sort((a, b) => b.t - a.t);
    const top = times[0];
    return {
      count: n,
      lastLabel: top
        ? `${formatDistanceToNow(top.t, { addSuffix: true })} · ${top.label}`
        : null,
    };
  }, [activities, appointments]);

  if (!contactId) return <span className="text-xs text-muted-foreground">—</span>;
  if (isLoading) return <span className="text-xs text-muted-foreground">Loading activity…</span>;

  return (
    <span className="text-xs text-muted-foreground">
      {count === 0 ? "No activity logged yet" : `${count} item${count === 1 ? "" : "s"} · Last: ${lastLabel}`}
    </span>
  );
}
