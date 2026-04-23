import { ActivityTimeline } from "@/components/activity/ActivityTimeline";

interface ContactActivityTimelineProps {
  contactId: string | null;
  onAddNote?: () => void;
  compact?: boolean;
  limit?: number;
  showAddNote?: boolean;
  includeAppointments?: boolean;
  embedded?: boolean;
}

/** Contact-scoped activity timeline (activity_log + appointments). */
export function ContactActivityTimeline({
  contactId,
  onAddNote,
  compact,
  limit,
  showAddNote = true,
  includeAppointments = true,
  embedded,
}: ContactActivityTimelineProps) {
  return (
    <ActivityTimeline
      entityType="contact"
      entityId={contactId}
      showAddNote={showAddNote}
      includeAppointments={includeAppointments}
      compact={compact}
      limit={limit}
      embedded={embedded}
    />
  );
}
