import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  MessageSquare,
  Phone,
  Mail,
  Home,
  FileText,
  RefreshCw,
  Cog,
  Key,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { ActivityLogRow } from "@/hooks/useActivityLog";
import { useActivityLog, useCreateActivityLog } from "@/hooks/useActivityLog";
import { useAppointments } from "@/hooks/useAppointments";
import { useMemo } from "react";

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  inspection: Home,
  status_change: RefreshCw,
  system: Cog,
  open_house: Home,
  settlement: Key,
};

type EntityType = "contact" | "property" | "listing";

interface ActivityTimelineProps {
  entityType: EntityType;
  entityId: string | null | undefined;
  /** Show Add note button and allow inline create */
  showAddNote?: boolean;
  /** Include appointments in feed (only for contact) */
  includeAppointments?: boolean;
  /** Max items to show; default unlimited */
  limit?: number;
}

type TimelineItem =
  | { kind: "activity"; data: ActivityLogRow }
  | { kind: "appointment"; data: { id: string; title: string; date: string; location: string | null } };

export function ActivityTimeline({
  entityType,
  entityId,
  showAddNote = false,
  includeAppointments = false,
  limit,
}: ActivityTimelineProps) {
  const filters =
    entityType === "contact"
      ? { contactId: entityId }
      : entityType === "property"
        ? { propertyId: entityId }
        : { listingId: entityId };

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");

  const { data: activities = [], isLoading } = useActivityLog(filters);
  const createLog = useCreateActivityLog();
  const { data: appointments = [] } = useAppointments();

  const contactId = entityType === "contact" ? entityId : undefined;
  const contactAppointments = contactId
    ? appointments.filter((a) => a.contact_id === contactId)
    : [];

  const handleAddNote = async () => {
    if (!entityId) return;
    await createLog.mutateAsync({
      activity_type: "note",
      title: noteTitle.trim() || "Note",
      description: noteDescription.trim() || null,
      contact_id: entityType === "contact" ? entityId : null,
      property_id: entityType === "property" ? entityId : null,
      listing_id: entityType === "listing" ? entityId : null,
    });
    setNoteTitle("");
    setNoteDescription("");
    setNoteOpen(false);
  };

  const items = useMemo((): TimelineItem[] => {
    const list: TimelineItem[] = activities.map((a) => ({ kind: "activity", data: a }));
    if (includeAppointments && entityType === "contact") {
      contactAppointments.forEach((apt) => {
        list.push({
          kind: "appointment",
          data: {
            id: apt.id,
            title: apt.title,
            date: apt.date,
            location: apt.location ?? null,
          },
        });
      });
    }
    list.sort((a, b) => {
      const timeA = a.kind === "activity" ? new Date(a.data.occurred_at).getTime() : new Date(a.data.date).getTime();
      const timeB = b.kind === "activity" ? new Date(b.data.occurred_at).getTime() : new Date(b.data.date).getTime();
      return timeB - timeA;
    });
    return limit ? list.slice(0, limit) : list;
  }, [activities, includeAppointments, entityType, contactAppointments, limit]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
        <div className="h-16 bg-white/10 rounded animate-pulse" />
        <div className="h-16 bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Activity</h3>
        {showAddNote && entityId && (
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setNoteOpen(true)} disabled={createLog.isPending}>
              <MessageSquare className="w-4 h-4" /> Add note
            </Button>
            <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add note</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="note-title">Title</Label>
                    <Input
                      id="note-title"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Brief title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="note-desc">Description</Label>
                    <Textarea
                      id="note-desc"
                      value={noteDescription}
                      onChange={(e) => setNoteDescription(e.target.value)}
                      placeholder="Note details..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddNote} disabled={createLog.isPending}>
                    Save note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      <div className="space-y-4">
        {items.map((item) =>
          item.kind === "activity" ? (
            <ActivityLogItem key={item.data.id} row={item.data} />
          ) : (
            <div
              key={`apt-${item.data.id}`}
              className="flex gap-3 pb-4 border-b border-border last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{item.data.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(item.data.date), "PPp")}</p>
                {item.data.location && <p className="text-xs text-muted-foreground">{item.data.location}</p>}
              </div>
            </div>
          )
        )}
        {items.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-6">No activity yet. Log your first interaction.</p>
        )}
      </div>
    </div>
  );
}

function ActivityLogItem({ row }: { row: ActivityLogRow }) {
  const Icon = ACTIVITY_ICONS[row.activity_type] ?? FileText;
  return (
    <div className="flex gap-3 pb-4 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{row.title}</p>
        {row.description && <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>}
        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(row.occurred_at), { addSuffix: true })}
          </span>
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded capitalize">{row.activity_type.replace("_", " ")}</span>
        </div>
      </div>
    </div>
  );
}
