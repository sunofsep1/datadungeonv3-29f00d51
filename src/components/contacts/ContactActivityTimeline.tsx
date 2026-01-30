import { Button } from "@/components/ui/button";
import { Calendar, Clock, MessageSquare } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useInteractions, type Interaction } from "@/hooks/useInteractions";
import { useAppointments } from "@/hooks/useAppointments";

interface ContactActivityTimelineProps {
  contactId: string | null;
  onAddNote: () => void;
}

export function ContactActivityTimeline({ contactId, onAddNote }: ContactActivityTimelineProps) {
  const { data: interactions = [] } = useInteractions(contactId || undefined);
  const { data: appointments = [] } = useAppointments();
  const contactAppointments = contactId
    ? appointments.filter((apt) => apt.contact_id === contactId)
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Activity</h3>
        <Button variant="outline" size="sm" className="gap-2" onClick={onAddNote}>
          <MessageSquare className="w-4 h-4" /> Add note
        </Button>
      </div>
      <div className="space-y-4">
        {contactAppointments.map((apt) => (
          <div key={apt.id} className="flex gap-3 pb-4 border-b border-white/10 last:border-0">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-white">{apt.title}</p>
              <p className="text-xs text-white/60">{format(new Date(apt.date), "PPp")}</p>
              {apt.location && <p className="text-xs text-white/60">{apt.location}</p>}
            </div>
          </div>
        ))}
        {interactions.map((interaction: Interaction) => (
          <div key={interaction.id} className="flex gap-3 pb-4 border-b border-white/10 last:border-0">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm capitalize text-white">{interaction.type}</p>
              {interaction.subject && <p className="text-sm text-white">{interaction.subject}</p>}
              {interaction.body && <p className="text-xs text-white/60 mt-1">{interaction.body}</p>}
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-white/60" />
                <span className="text-xs text-white/60">{formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true })}</span>
                {interaction.channel && <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded capitalize">{interaction.channel}</span>}
              </div>
            </div>
          </div>
        ))}
        {interactions.length === 0 && contactAppointments.length === 0 && (
          <p className="text-white/60 text-sm text-center py-6">No activity yet. Log your first interaction.</p>
        )}
      </div>
    </div>
  );
}
