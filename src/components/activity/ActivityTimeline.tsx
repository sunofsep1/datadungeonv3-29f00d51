import { useMemo, useState } from "react";
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
  HandCoins,
  Megaphone,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useCreateActivityLog } from "@/hooks/useActivityLog";
import { useCommunicationsTimeline } from "@/hooks/useCommunicationsTimeline";
import { isFeatureEnabled } from "@/lib/featureFlags";
import type { CommunicationsKind, UnifiedCommItem } from "@/lib/communicationsTimeline";

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  inspection: Home,
  open_house: Home,
  status_change: RefreshCw,
  system: Cog,
  settlement: Key,
  offer: HandCoins,
  comms: Megaphone,
  appointment: Calendar,
};

type EntityType = "contact" | "property" | "listing";

interface ActivityTimelineProps {
  entityType: EntityType;
  entityId: string | null | undefined;
  /** Merge activity_log + interactions + sms_outbound (+ appointments on contacts). */
  unifiedComms?: boolean;
  /** Contact IDs for SMS/interaction merge on listings. */
  linkedContactIds?: string[];
  showAddNote?: boolean;
  includeAppointments?: boolean;
  limit?: number;
  compact?: boolean;
  embedded?: boolean;
  /** Override heading (default: Communications or Activity). */
  title?: string;
}

export function ActivityTimeline({
  entityType,
  entityId,
  unifiedComms = true,
  linkedContactIds = [],
  showAddNote = false,
  includeAppointments = false,
  limit,
  compact = isFeatureEnabled("compactTimelineV1"),
  embedded = false,
  title,
}: ActivityTimelineProps) {
  const contactId = entityType === "contact" ? entityId : null;
  const propertyId = entityType === "property" ? entityId : null;
  const listingId = entityType === "listing" ? entityId : null;

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const createLog = useCreateActivityLog();

  const { items, isLoading } = useCommunicationsTimeline({
    contactId,
    propertyId,
    listingId,
    linkedContactIds: unifiedComms ? linkedContactIds : [],
    includeAppointments: unifiedComms && includeAppointments,
    unifiedComms,
    limit: limit ?? 120,
  });

  const heading = title ?? (unifiedComms ? "Communications" : "Activity");

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

  const displayItems = useMemo(() => {
    if (unifiedComms) return items;
    return items.filter((i) => i.source === "activity_log" || i.source === "appointment");
  }, [items, unifiedComms]);

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
        {!embedded ? <h3 className="font-semibold text-foreground">{heading}</h3> : <span className="sr-only">{heading}</span>}
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
        {displayItems.map((item) => (
          <CommTimelineItem
            key={item.id}
            item={item}
            compact={compact}
            expanded={expandedIds.has(item.id)}
            onToggleExpand={() =>
              setExpandedIds((prev) => {
                const next = new Set(prev);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
              })
            }
          />
        ))}
        {displayItems.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">
            {unifiedComms ? "No communications logged yet." : "No activity yet."}
          </p>
        )}
      </div>
    </div>
  );
}

function CommTimelineItem({
  item,
  compact,
  expanded,
  onToggleExpand,
}: {
  item: UnifiedCommItem;
  compact: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const Icon = ACTIVITY_ICONS[item.kind] ?? FileText;
  const kindLabel = formatKindLabel(item.kind);

  return (
    <div className={compact ? "flex gap-2 py-2 border-b border-border last:border-0" : "flex gap-3 pb-4 border-b border-border last:border-0"}>
      <div className={compact ? "w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0" : "w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"}>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{item.title}</p>
        {item.description && (!compact || expanded) ? (
          <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{item.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            · {format(new Date(item.occurredAt), compact ? "d MMM, h:mm a" : "PPp")}
          </span>
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded capitalize">{kindLabel}</span>
          {item.source === "interaction" ? (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Legacy</span>
          ) : null}
          {compact && item.description ? (
            <button type="button" className="text-xs text-primary" onClick={onToggleExpand}>
              {expanded ? "Less" : "More"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatKindLabel(kind: CommunicationsKind): string {
  return kind.replace(/_/g, " ");
}
