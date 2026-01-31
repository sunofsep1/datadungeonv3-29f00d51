import { ActivityTimeline } from "@/components/activity/ActivityTimeline";

interface ContactActivityTimelineProps {
  contactId: string | null;
  onAddNote?: () => void;
}

/** Contact-scoped activity timeline (activity_log + appointments). */
export function ContactActivityTimeline({ contactId, onAddNote }: ContactActivityTimelineProps) {
  return (
    <ActivityTimeline
      entityType="contact"
      entityId={contactId}
      showAddNote={true}
      includeAppointments={true}
    />
  );
}
