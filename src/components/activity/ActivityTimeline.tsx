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
import { useAppointmentsByContact } from "@/hooks/useAppointments";
import { useMemo } from "react";
import { isFeatureEnabled } from "@/lib/featureFlags";

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
  compact?: boolean;
  /** Hide the built-in "Activity" title row (parent provides chrome, e.g. expandable section). */
  embedded?: boolean;
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
  compact = isFeatureEnabled("compactTimelineV1"),
  embedded = false,
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

  const { data: activities = [], isLoading } = useActivityLog({ ...filters, limit: limit ?? 120 });
  const createLog = useCreateActivityLog();
  const { data: contactAppointments = [] } = useAppointmentsByContact(entityType === "contact" ? entityId : null, limit ?? 120);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
      <div className={embedded ? "flex items-center justify-end mb-3" : "flex items-center justify-between mb-4"}>
        {!embedded ? <h3 className="font-semibold text-foreground">Activity</h3> : <span className="sr-only">Activity</span>}
        {showAddNote && entityId && (
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setNoteOpen(true)} disabled={createLog.isPending}>
              <MessageSquare className="w-4 h-4" /> Add note
            </Button>
            <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
              <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
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
      <div className={compact ? "space-y-2" : "space-y-4"}>
        {items.map((item) =>
          item.kind === "activity" ? (
            <ActivityLogItem
              key={item.data.id}
              row={item.data}
              compact={compact}
              expanded={expandedIds.has(item.data.id)}
              onToggleExpand={() =>
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.data.id)) next.delete(item.data.id);
                  else next.add(item.data.id);
                  return next;
                })
              }
            />
          ) : (
            <div
              key={`apt-${item.data.id}`}
              className={compact ? "flex gap-2 py-2 border-b border-border last:border-0" : "flex gap-3 pb-4 border-b border-border last:border-0"}
            >
              <div className={compact ? "w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0" : "w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"}>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{item.data.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(item.data.date), compact ? "d MMM, h:mm a" : "PPp")}</p>
                {!compact && item.data.location && <p className="text-xs text-muted-foreground">{item.data.location}</p>}
              </div>
            </div>
          )
        )}
        {items.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">No activity yet.</p>
        )}
      </div>
    </div>
  );
}

function ActivityLogItem({
  row,
  compact,
  expanded,
  onToggleExpand,
}: {
  row: ActivityLogRow;
  compact: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const Icon = ACTIVITY_ICONS[row.activity_type] ?? FileText;
  return (
    <div className={compact ? "flex gap-2 py-2 border-b border-border last:border-0" : "flex gap-3 pb-4 border-b border-border last:border-0"}>
      <div className={compact ? "w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0" : "w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"}>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{row.title}</p>
        {row.description && (!compact || expanded) ? <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p> : null}
        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(row.occurred_at), { addSuffix: true })}
          </span>
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded capitalize">{row.activity_type.replace("_", " ")}</span>
          {compact && row.description ? (
            <button type="button" className="text-xs text-primary" onClick={onToggleExpand}>
              {expanded ? "Less" : "More"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
