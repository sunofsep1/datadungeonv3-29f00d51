import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  GripVertical,
  Inbox,
  Loader2,
  ParkingSquare,
  Radio,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAppointments } from "@/hooks/useAppointments";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { useContactUrgency } from "@/hooks/useContactUrgency";
import {
  useOpenContactTasksForUser,
  useCreateContactTask,
  useUpdateContactTask,
  type ContactTask,
} from "@/hooks/useContactTasks";
import { useTodos, useAddTodo, useUpdateTodo, type Todo } from "@/hooks/useTodos";
import { useAuth } from "@/contexts/AuthContext";
import { hrefForWorkNow } from "@/lib/attentionWorkWorkspace";
import {
  urgencyTierBadgeClass,
  urgencyTierLabel,
  urgencyTierSpotlightCardClass,
  urgencyTierSpotlightRailClass,
} from "@/lib/urgencyTierStyles";
import {
  loadHubTriage,
  saveHubTriage,
  assignItem,
  removeItem,
  getItemZone,
  getItemOrder,
  type HubZone,
  type HubTriageState,
} from "@/lib/dailyHubTriage";
import { cn } from "@/lib/utils";
import type { ContactUrgencyTier } from "@/lib/contactUrgency";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ─── Types ───────────────────────────────────────────────────────────────────

type AttentionItemKind = "sequenceTask" | "contactTask" | "todoTask" | "appointment";

type AttentionItem = {
  id: string;
  kind: AttentionItemKind;
  urgency: ContactUrgencyTier;
  score: number;
  title: string;
  detail: string;
  whenText: string;
  dueAt: Date | null;
  contactId?: string;
  contactTaskId?: string;
  sequenceEnrollmentId?: string | null;
  todoId?: string;
  appointmentId?: string;
  canComplete: boolean;
  reason: string;
};

// ─── Hub column definitions ───────────────────────────────────────────────────

const HUB_ZONES: { id: HubZone; label: string; description: string; icon: React.ElementType }[] = [
  { id: "schedule",   label: "Schedule",    description: "Auto-sorted by due date",           icon: CalendarClock },
  { id: "focusRoom",  label: "Focus Room",  description: "Deep work — opens Work session",    icon: Briefcase },
  { id: "working",    label: "Working On",  description: "Doing today",                       icon: Sparkles },
  { id: "holdingBay", label: "Holding Bay", description: "On your radar, not finishing now",  icon: Radio },
  { id: "parked",     label: "Parked",      description: "Set aside for later",               icon: ParkingSquare },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fallbackScoreByUrgency(
  dueAt: Date | null,
  kind: AttentionItemKind,
  priority?: "low" | "medium" | "high",
): { urgency: ContactUrgencyTier; score: number } {
  const now = Date.now();
  const due = dueAt ? dueAt.getTime() : now + 1000 * 60 * 60 * 24 * 14;
  const deltaHours = (due - now) / (1000 * 60 * 60);
  const priorityWeight = priority === "high" ? 20 : priority === "medium" ? 10 : 0;
  const kindWeight = kind === "sequenceTask" ? 24 : kind === "contactTask" ? 16 : kind === "appointment" ? 12 : 8;

  if (deltaHours < 0) {
    const overdueWeight = Math.min(120, Math.abs(deltaHours));
    return { urgency: "immediate", score: 340 + overdueWeight + kindWeight + priorityWeight };
  }
  if (deltaHours <= 6)  return { urgency: "priority", score: 260 - deltaHours + kindWeight + priorityWeight };
  if (deltaHours <= 24) return { urgency: "priority", score: 220 - deltaHours + kindWeight + priorityWeight };
  if (deltaHours <= 72) return { urgency: "planned",  score: 160 - deltaHours + kindWeight + priorityWeight };
  return { urgency: "backlog", score: 100 - Math.min(deltaHours, 72) + kindWeight + priorityWeight };
}

function kindBadgeLabel(kind: AttentionItemKind): string {
  if (kind === "sequenceTask") return "Sequence";
  if (kind === "contactTask")  return "Contact";
  if (kind === "todoTask")     return "General";
  return "Appointment";
}

function timingBadgeLabel(dueAt: Date | null): string {
  if (!dueAt) return "No date";
  if (isPast(dueAt) && !isToday(dueAt)) return "Overdue";
  if (isToday(dueAt)) return "Today";
  return "Coming Up";
}

function urgencyDotClass(tier: ContactUrgencyTier): string {
  if (tier === "immediate") return "bg-red-400";
  if (tier === "priority")  return "bg-amber-400";
  if (tier === "planned")   return "bg-sky-400";
  return "bg-emerald-400";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybe = (error as { message?: unknown }).message;
    if (typeof maybe === "string" && maybe.trim()) return maybe;
  }
  return "Could not complete this item.";
}

function isoFromLocalDateTime(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

// ─── Item card ────────────────────────────────────────────────────────────────

function HubItemCard({
  item,
  zone,
  onDragStart,
  onOpen,
  onComplete,
  onReturnToSchedule,
  isCompleting,
}: {
  item: AttentionItem;
  zone: HubZone;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onOpen: (item: AttentionItem) => void;
  onComplete: (item: AttentionItem) => void;
  onReturnToSchedule: (id: string) => void;
  isCompleting: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className={cn(
        "group flex cursor-grab items-start gap-2 rounded-lg border px-3 py-2.5 shadow-sm transition-colors active:cursor-grabbing",
        urgencyTierSpotlightCardClass(item.urgency),
        "hover:bg-accent/20",
      )}
    >
      {/* Left rail */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
        <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", urgencyDotClass(item.urgency))} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">
          {item.kind === "todoTask" ? item.title : item.detail}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {item.kind === "todoTask" ? "General task" : item.title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">{item.whenText}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="border-border/70 text-[10px]">
            {kindBadgeLabel(item.kind)}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px]", urgencyTierBadgeClass(item.urgency))}>
            {urgencyTierLabel(item.urgency)}
          </Badge>
          <Badge variant="outline" className="border-border/70 text-[10px]">
            {timingBadgeLabel(item.dueAt)}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.canComplete && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-2 text-[11px]"
              disabled={isCompleting}
              onClick={(e) => { e.stopPropagation(); onComplete(item); }}
            >
              {isCompleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Done
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-2 text-[11px]"
            onClick={(e) => { e.stopPropagation(); onOpen(item); }}
          >
            Open
          </Button>
          {zone !== "schedule" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onReturnToSchedule(item.id); }}
            >
              <RotateCcw className="h-3 w-3" />
              Return to Schedule
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drop column ──────────────────────────────────────────────────────────────

function HubColumn({
  zone,
  items,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onOpen,
  onComplete,
  onReturnToSchedule,
  completingIds,
}: {
  zone: typeof HUB_ZONES[number];
  items: AttentionItem[];
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent, zoneId: HubZone) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, zoneId: HubZone) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onOpen: (item: AttentionItem) => void;
  onComplete: (item: AttentionItem) => void;
  onReturnToSchedule: (id: string) => void;
  completingIds: Set<string>;
}) {
  const Icon = zone.icon;

  return (
    <div
      className={cn(
        "flex min-h-[200px] min-w-[220px] flex-1 flex-col rounded-xl border border-border/60 bg-card/40 transition-colors",
        isDragOver && "border-primary/60 bg-primary/5",
        zone.id === "schedule" && "min-w-[280px] flex-[2]",
      )}
      onDragOver={(e) => onDragOver(e, zone.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, zone.id)}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{zone.label}</p>
            <p className="truncate text-[10px] text-muted-foreground">{zone.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 border-border/60 px-1.5 py-0 text-[10px]">
          {items.length}
        </Badge>
      </div>

      {/* Items */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-8",
            isDragOver ? "bg-primary/10" : "bg-transparent",
          )}>
            <Inbox className="h-5 w-5 text-muted-foreground/40" />
            <p className="text-[11px] text-muted-foreground/60">Drop items here</p>
          </div>
        ) : (
          items.map((item) => (
            <HubItemCard
              key={item.id}
              item={item}
              zone={zone.id}
              onDragStart={onDragStart}
              onOpen={onOpen}
              onComplete={onComplete}
              onReturnToSchedule={onReturnToSchedule}
              isCompleting={completingIds.has(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main widget ─────────────────────────────────────────────────────────────

export function AttentionHubWidget() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: contacts = [] }        = useContacts();
  const { data: appointments = [] }    = useAppointments();
  const { data: openContactTasks = [] } = useOpenContactTasksForUser();
  const { data: todos = [] }           = useTodos();
  const { urgencyByContactId }         = useContactUrgency();

  const addTodo         = useAddTodo();
  const createContactTask = useCreateContactTask();
  const updateContactTask = useUpdateContactTask();
  const updateTodo        = useUpdateTodo();

  // ── Triage state (persisted in localStorage) ──────────────────────────────
  const [triageState, setTriageState] = useState<HubTriageState>(() =>
    loadHubTriage(user?.id)
  );

  // Auth resolves after first paint — reload triage once we have the real userId
  useEffect(() => {
    if (!user?.id) return;
    setTriageState(loadHubTriage(user.id));
  }, [user?.id]);

  // ── Drag state ─────────────────────────────────────────────────────────────
  const [draggedItemId, setDraggedItemId]   = useState<string | null>(null);
  const [dragOverZone, setDragOverZone]     = useState<HubZone | null>(null);
  const [completingIds, setCompletingIds]   = useState<Set<string>>(new Set());

  // ── Add task UI ────────────────────────────────────────────────────────────
  const [addType,      setAddType]      = useState<"todo" | "contact">("todo");
  const [newTitle,     setNewTitle]     = useState("");
  const [newDueAt,     setNewDueAt]     = useState("");
  const [newContactId, setNewContactId] = useState("");

  // ── Contact name lookup ────────────────────────────────────────────────────
  const contactNameById = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => map.set(c.id, getContactDisplayName(c)));
    return map;
  }, [contacts]);

  // ── Build all attention items ──────────────────────────────────────────────
  const items = useMemo(() => {
    const nextItems: AttentionItem[] = [];
    const now = Date.now();

    openContactTasks.forEach((task: ContactTask) => {
      const dueAt = task.due_at ? new Date(task.due_at) : null;
      const contactName = contactNameById.get(task.contact_id) ?? "Contact";
      const kind: AttentionItemKind = task.sequence_enrollment_id ? "sequenceTask" : "contactTask";
      const contactUrgency = urgencyByContactId.get(task.contact_id);
      const fallback = fallbackScoreByUrgency(dueAt, kind, "high");
      const scored = contactUrgency
        ? { urgency: contactUrgency.tier, score: contactUrgency.score + fallback.score / 10 }
        : fallback;
      const dueText =
        dueAt == null
          ? "No due date"
          : isPast(dueAt) && !isToday(dueAt)
            ? `Should have started · ${format(dueAt, "EEE d MMM yyyy")}`
            : isToday(dueAt)
              ? `Start today · ${format(dueAt, "EEE d MMM yyyy")}`
              : `Start in ${formatDistanceToNow(dueAt)} · ${format(dueAt, "EEE d MMM yyyy")}`;
      const reason =
        contactUrgency?.reasons[0] ??
        (task.sequence_enrollment_id
          ? "Sequence step due — unblocks progression."
          : dueAt && isPast(dueAt) && !isToday(dueAt)
            ? "Overdue contact follow-up."
            : "Contact task due soon.");

      nextItems.push({
        id: `contact-task-${task.id}`,
        kind,
        urgency: scored.urgency,
        score: scored.score,
        title: contactName,
        detail: task.title,
        whenText: dueText,
        dueAt,
        contactId: task.contact_id,
        contactTaskId: task.id,
        sequenceEnrollmentId: task.sequence_enrollment_id,
        canComplete: true,
        reason,
      });
    });

    todos
      .filter((todo: Todo) => !todo.completed)
      .forEach((todo: Todo) => {
        const dueAt = todo.due_at ? new Date(todo.due_at) : null;
        const scored = fallbackScoreByUrgency(dueAt, "todoTask", todo.priority);
        const dueText =
          dueAt == null
            ? "No due date set"
            : isPast(dueAt) && !isToday(dueAt)
              ? `Should have started · ${format(dueAt, "EEE d MMM yyyy")}`
              : isToday(dueAt)
                ? `Start today · ${format(dueAt, "EEE d MMM yyyy")}`
                : `Start in ${formatDistanceToNow(dueAt)} · ${format(dueAt, "EEE d MMM yyyy")}`;

        nextItems.push({
          id: `todo-${todo.id}`,
          kind: "todoTask",
          urgency: scored.urgency,
          score: scored.score,
          title: todo.title,
          detail: `General task (${todo.priority ?? "medium"})`,
          whenText: dueText,
          dueAt,
          todoId: todo.id,
          canComplete: true,
          reason:
            todo.priority === "high"
              ? "High-priority personal task."
              : dueAt && isPast(dueAt) && !isToday(dueAt)
                ? "Overdue personal task."
                : "General task with upcoming due date.",
        });
      });

    appointments
      .filter((appt) => new Date(appt.date).getTime() >= now - 1000 * 60 * 60 * 2)
      .slice(0, 20)
      .forEach((appt) => {
        const dueAt = new Date(appt.date);
        const base = fallbackScoreByUrgency(dueAt, "appointment", "medium");
        const contactName = appt.contact_id ? contactNameById.get(appt.contact_id) : null;
        const contactUrgency = appt.contact_id ? urgencyByContactId.get(appt.contact_id) : null;
        const scored = contactUrgency
          ? { urgency: contactUrgency.tier, score: contactUrgency.score + base.score / 12 }
          : base;

        nextItems.push({
          id: `appointment-${appt.id}`,
          kind: "appointment",
          urgency: scored.urgency,
          score: scored.score,
          title: appt.title || "Appointment",
          detail: contactName ? `Prep with ${contactName}` : "Prepare and review notes",
          whenText: isToday(dueAt)
            ? `Today at ${format(dueAt, "h:mm a")}`
            : `${formatDistanceToNow(dueAt, { addSuffix: true })}`,
          dueAt,
          appointmentId: appt.id,
          contactId: appt.contact_id ?? undefined,
          canComplete: false,
          reason: isToday(dueAt) ? "Appointment is today." : "Upcoming appointment.",
        });
      });

    return nextItems;
  }, [appointments, contactNameById, openContactTasks, todos, urgencyByContactId]);

  // ── Partition items into zones ─────────────────────────────────────────────
  const itemsByZone = useMemo(() => {
    const zones: Record<HubZone, AttentionItem[]> = {
      schedule: [], focusRoom: [], working: [], holdingBay: [], parked: [],
    };

    items.forEach((item) => {
      const zone = getItemZone(triageState, item.id);
      zones[zone].push(item);
    });

    // Schedule: sort by urgency score descending
    zones.schedule.sort((a, b) => b.score - a.score);

    // Other zones: sort by saved order
    (["focusRoom", "working", "holdingBay", "parked"] as HubZone[]).forEach((zoneId) => {
      zones[zoneId].sort((a, b) => getItemOrder(triageState, a.id) - getItemOrder(triageState, b.id));
    });

    return zones;
  }, [items, triageState]);

  const totalItems = items.length;

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, zoneId: HubZone) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverZone(zoneId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverZone(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, zoneId: HubZone) => {
      e.preventDefault();
      setDragOverZone(null);

      if (!draggedItemId || !user?.id) {
        setDraggedItemId(null);
        return;
      }

      const currentZone = getItemZone(triageState, draggedItemId);
      if (currentZone === zoneId) {
        setDraggedItemId(null);
        return;
      }

      const existingInZone = Object.values(triageState.assignments).filter(
        (a) => a.zone === zoneId
      ).length;

      const newState = assignItem(triageState, draggedItemId, zoneId, existingInZone);
      setTriageState(newState);
      saveHubTriage(user.id, newState);
      setDraggedItemId(null);
    },
    [draggedItemId, triageState, user?.id]
  );

  const handleReturnToSchedule = useCallback(
    (itemId: string) => {
      if (!user?.id) return;
      const newState = removeItem(triageState, itemId);
      setTriageState(newState);
      saveHubTriage(user.id, newState);
    },
    [triageState, user?.id]
  );

  // ── Open / complete handlers ───────────────────────────────────────────────
  const handleOpenItem = useCallback(
    (item: AttentionItem) => {
      if (item.kind === "appointment") { navigate("/appointments"); return; }
      if (item.contactId) {
        navigate(item.kind === "sequenceTask"
          ? `/contacts/${item.contactId}?nurtureFocus=1`
          : `/contacts/${item.contactId}`);
        return;
      }
      navigate("/tasks");
    },
    [navigate]
  );

  const handleCompleteItem = useCallback(
    async (item: AttentionItem) => {
      setCompletingIds((prev) => new Set([...prev, item.id]));
      try {
        if (item.kind === "todoTask" && item.todoId) {
          await updateTodo.mutateAsync({ id: item.todoId, completed: true });
        } else if ((item.kind === "contactTask" || item.kind === "sequenceTask") && item.contactTaskId) {
          await updateContactTask.mutateAsync({
            id: item.contactTaskId,
            completed_at: new Date().toISOString(),
          });
        }
        // Remove from triage after completion
        if (user?.id) {
          const newState = removeItem(triageState, item.id);
          setTriageState(newState);
          saveHubTriage(user.id, newState);
        }
        toast({ title: "Done!", description: "Item marked complete." });
      } catch (error) {
        toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
      } finally {
        setCompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [updateTodo, updateContactTask, triageState, user?.id, toast]
  );

  // ── Add task ───────────────────────────────────────────────────────────────
  const handleAdd = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) {
      toast({ title: "Title required", description: "Please enter a title.", variant: "destructive" });
      return;
    }
    try {
      if (addType === "todo") {
        await addTodo.mutateAsync({ title, due_at: isoFromLocalDateTime(newDueAt) });
      } else {
        if (!newContactId) {
          toast({ title: "Contact required", description: "Select a contact.", variant: "destructive" });
          return;
        }
        await createContactTask.mutateAsync({
          contact_id: newContactId,
          title,
          due_at: isoFromLocalDateTime(newDueAt),
        });
      }
      setNewTitle("");
      setNewDueAt("");
      setNewContactId("");
      toast({ title: "Added", description: addType === "todo" ? "Task added." : "Contact task added." });
    } catch (error) {
      toast({ title: "Add failed", description: getErrorMessage(error), variant: "destructive" });
    }
  }, [addTodo, addType, createContactTask, newContactId, newDueAt, newTitle, toast]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card className="zoho-card border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-4">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Daily brief
          </p>
          <p className="text-[11px] text-muted-foreground">
            Drag cards between columns — Schedule auto-sorts by due date.
          </p>
        </div>
        <Badge variant="outline" className="border-border/80 text-[11px]">
          {totalItems} items
        </Badge>
      </div>

      {/* Add task */}
      <Collapsible className="group mb-3">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            Add task
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2 rounded-lg border border-border/70 bg-card/45 p-2.5">
          <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)_190px_170px_auto]">
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              value={addType}
              onChange={(e) => setAddType(e.target.value as "todo" | "contact")}
            >
              <option value="todo">General task</option>
              <option value="contact">Contact task</option>
            </select>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title..."
              className="h-9 text-xs"
            />
            <Input
              type="datetime-local"
              value={newDueAt}
              onChange={(e) => setNewDueAt(e.target.value)}
              className="h-9 text-xs"
            />
            {addType === "contact" ? (
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                value={newContactId}
                onChange={(e) => setNewContactId(e.target.value)}
              >
                <option value="">Select contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{getContactDisplayName(c)}</option>
                ))}
              </select>
            ) : (
              <div />
            )}
            <Button
              size="sm"
              className="h-9 text-xs"
              disabled={addTodo.isPending || createContactTask.isPending}
              onClick={handleAdd}
            >
              {addTodo.isPending || createContactTask.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {HUB_ZONES.map((zone) => (
          <HubColumn
            key={zone.id}
            zone={zone}
            items={itemsByZone[zone.id]}
            isDragOver={dragOverZone === zone.id}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onOpen={handleOpenItem}
            onComplete={handleCompleteItem}
            onReturnToSchedule={handleReturnToSchedule}
            completingIds={completingIds}
          />
        ))}
      </div>
    </Card>
  );
}
