import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Radio,
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
  type ContactTask,
} from "@/hooks/useContactTasks";
import { useTodos, useAddTodo, type Todo } from "@/hooks/useTodos";
import { hrefForWorkNow } from "@/lib/attentionWorkWorkspace";
import {
  compareAttentionItemsByTierScoreDue,
  urgencyTierBadgeClass,
  urgencyTierLabel,
  urgencyTierSpotlightCardClass,
  urgencyTierSpotlightRailClass,
} from "@/lib/urgencyTierStyles";
import { cn } from "@/lib/utils";
import type { ContactUrgencyTier } from "@/lib/contactUrgency";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

type AttentionItemKind = "sequenceTask" | "contactTask" | "todoTask" | "appointment";
type AttentionItemUrgency = ContactUrgencyTier;

type AttentionItem = {
  id: string;
  kind: AttentionItemKind;
  urgency: AttentionItemUrgency;
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

function fallbackScoreByUrgency(
  dueAt: Date | null,
  kind: AttentionItemKind,
  priority?: "low" | "medium" | "high",
): { urgency: AttentionItemUrgency; score: number } {
  const now = Date.now();
  const due = dueAt ? dueAt.getTime() : now + 1000 * 60 * 60 * 24 * 14;
  const deltaHours = (due - now) / (1000 * 60 * 60);
  const priorityWeight = priority === "high" ? 20 : priority === "medium" ? 10 : 0;
  const kindWeight = kind === "sequenceTask" ? 24 : kind === "contactTask" ? 16 : kind === "appointment" ? 12 : 8;

  if (deltaHours < 0) {
    const overdueWeight = Math.min(120, Math.abs(deltaHours));
    return { urgency: "immediate", score: 340 + overdueWeight + kindWeight + priorityWeight };
  }
  if (deltaHours <= 6) {
    return { urgency: "priority", score: 260 - deltaHours + kindWeight + priorityWeight };
  }
  if (deltaHours <= 24) {
    return { urgency: "priority", score: 220 - deltaHours + kindWeight + priorityWeight };
  }
  if (deltaHours <= 72) {
    return { urgency: "planned", score: 160 - deltaHours + kindWeight + priorityWeight };
  }
  return { urgency: "backlog", score: 100 - Math.min(deltaHours, 72) + kindWeight + priorityWeight };
}

function kindBadgeLabel(kind: AttentionItemKind): string {
  if (kind === "sequenceTask") return "Sequence";
  if (kind === "contactTask") return "Contact";
  if (kind === "todoTask") return "General";
  return "Appointment";
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

/** Shared Embla options — drag-free + wheel-gestures feels fast/snappy vs native overflow scroll. */
const HUB_CAROUSEL_OPTS = {
  align: "start" as const,
  dragFree: true,
  containScroll: false,
};

/** Focus carousel slide width — slightly narrower than legacy tiles. */
const FOCUS_CARD_SLIDE_CLASS =
  "w-[min(calc(100vw-2.5rem),260px)] min-w-[240px] max-w-[260px] shrink-0 basis-[min(calc(100vw-2.5rem),260px)] pl-2 md:pl-4";

/** Compact focus tile — a bit taller than On my radar chips (~6.5rem). */
const FOCUS_CARD_HEIGHT_CLASS = "min-h-[8.5rem] max-h-[9.5rem]";

type ScheduleBucket = "overdue" | "today" | "upcoming";

type ScheduleRow = AttentionItem & { bucket: ScheduleBucket };

function urgencyDotClass(tier: ContactUrgencyTier): string {
  if (tier === "immediate") return "bg-red-400";
  if (tier === "priority") return "bg-amber-400";
  if (tier === "planned") return "bg-sky-400";
  return "bg-emerald-400";
}

function HubScheduleStrip({
  items,
  overdueCount,
  todayCount,
  upcomingCount,
  onOpen,
}: {
  items: ScheduleRow[];
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  onOpen: (item: AttentionItem) => void;
}) {
  const subtitle = [
    overdueCount > 0 ? `${overdueCount} overdue` : null,
    todayCount > 0 ? `${todayCount} today` : null,
    upcomingCount > 0 ? `${upcomingCount} upcoming` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Schedule</p>
          {subtitle ? <p className="text-[10px] text-muted-foreground/80">{subtitle}</p> : null}
        </div>
        {items.length > 0 ? (
          <Badge variant="outline" className="border-border/60 px-2 py-0 text-[10px]">
            {items.length}
          </Badge>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="px-0.5 text-xs text-muted-foreground">Nothing scheduled in range.</p>
      ) : (
        <div className="-mx-1 flex gap-2 overflow-x-auto overflow-y-visible pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-0 [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="min-w-[min(100%,260px)] max-w-[min(92vw,300px)] shrink-0 text-left sm:min-w-[240px]"
              onClick={() => onOpen(item)}
            >
              <div className="flex h-full min-h-[6.5rem] flex-col justify-between gap-2 rounded-lg border border-border/70 bg-background/55 px-3 py-2.5 shadow-sm transition-colors hover:bg-accent/30">
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background",
                      urgencyDotClass(item.urgency),
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {item.kind === "todoTask" ? item.title : item.detail}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground">
                      {item.kind === "todoTask" ? "General task" : item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{item.whenText}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize border-border/70">
                    {item.bucket}
                  </Badge>
                  <span className="text-[10px] text-primary">Open</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Each carousel gets its own plugin instance (Embla initializes plugins per root). */
function useHubWheelGesturesPlugins() {
  return useMemo(() => [WheelGesturesPlugin({ forceWheelAxis: "x" })], []);
}

export function AttentionHubWidget() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();
  const { data: openContactTasks = [] } = useOpenContactTasksForUser();
  const { data: todos = [] } = useTodos();
  const { urgencyByContactId } = useContactUrgency();

  const addTodo = useAddTodo();
  const createContactTask = useCreateContactTask();

  const [hiddenItemIds, setHiddenItemIds] = useState<string[]>([]);
  const [addType, setAddType] = useState<"todo" | "contact">("todo");
  const [newTitle, setNewTitle] = useState("");
  const [newDueAt, setNewDueAt] = useState("");
  const [newContactId, setNewContactId] = useState("");
  const [visibleUrgencyTiers, setVisibleUrgencyTiers] = useState<Set<ContactUrgencyTier>>(
    () => new Set<ContactUrgencyTier>(["immediate", "priority", "planned", "backlog"])
  );

  const contactNameById = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((contact) => {
      map.set(contact.id, getContactDisplayName(contact));
    });
    return map;
  }, [contacts]);

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
        ? { urgency: contactUrgency.tier, score: contactUrgency.score + (fallback.score / 10) }
        : fallback;
      const dueText =
        dueAt == null
          ? "No due date"
          : isPast(dueAt) && !isToday(dueAt)
            ? `Overdue since ${format(dueAt, "EEE d MMM")}`
            : isToday(dueAt)
              ? `Due today at ${format(dueAt, "h:mm a")}`
              : `${formatDistanceToNow(dueAt, { addSuffix: true })}`;
      const reason =
        contactUrgency?.reasons[0] ??
        (task.sequence_enrollment_id
          ? "Sequence step is due and can unblock next progression."
          : dueAt && isPast(dueAt) && !isToday(dueAt)
            ? "Overdue contact follow-up needs attention first."
            : "Contact task due soon for momentum and consistency.");

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
              ? `Overdue from ${format(dueAt, "EEE d MMM")}`
              : isToday(dueAt)
                ? `Due today at ${format(dueAt, "h:mm a")}`
                : `${formatDistanceToNow(dueAt, { addSuffix: true })}`;
        const reason =
          todo.priority === "high"
            ? "High-priority personal task."
            : dueAt && isPast(dueAt) && !isToday(dueAt)
              ? "Overdue personal task."
              : "General task with upcoming due date.";

        nextItems.push({
          id: `todo-${todo.id}`,
          kind: "todoTask",
          urgency: scored.urgency,
          score: scored.score,
          title: todo.title,
          detail: `General task (${todo.priority})`,
          whenText: dueText,
          dueAt,
          todoId: todo.id,
          canComplete: true,
          reason,
        });
      });

    appointments
      .filter((appointment) => new Date(appointment.date).getTime() >= now - 1000 * 60 * 60 * 2)
      .slice(0, 20)
      .forEach((appointment) => {
        const dueAt = new Date(appointment.date);
        const base = fallbackScoreByUrgency(dueAt, "appointment", "medium");
        const contactName = appointment.contact_id ? contactNameById.get(appointment.contact_id) : null;
        const contactUrgency = appointment.contact_id ? urgencyByContactId.get(appointment.contact_id) : null;
        const scored = contactUrgency
          ? { urgency: contactUrgency.tier, score: contactUrgency.score + (base.score / 12) }
          : base;
        const reason = isToday(dueAt)
          ? "Appointment is today and prep should happen now."
          : "Upcoming appointment with prep window opening soon.";
        nextItems.push({
          id: `appointment-${appointment.id}`,
          kind: "appointment",
          urgency: scored.urgency,
          score: scored.score,
          title: appointment.title || "Appointment",
          detail: contactName ? `Prep with ${contactName}` : "Prepare and review notes",
          whenText: isToday(dueAt)
            ? `Today at ${format(dueAt, "h:mm a")}`
            : `${formatDistanceToNow(dueAt, { addSuffix: true })}`,
          dueAt,
          appointmentId: appointment.id,
          canComplete: false,
          reason,
        });
      });

    return nextItems.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const at = a.dueAt ? a.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.dueAt ? b.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
  }, [appointments, contactNameById, openContactTasks, todos, urgencyByContactId]);

  const visibleItems = useMemo(
    () => items.filter((item) => !hiddenItemIds.includes(item.id)),
    [hiddenItemIds, items]
  );
  const tierFilteredItems = useMemo(
    () => visibleItems.filter((item) => visibleUrgencyTiers.has(item.urgency)),
    [visibleItems, visibleUrgencyTiers]
  );
  const timelineItems = useMemo(
    () =>
      [...tierFilteredItems].sort((a, b) => {
        const aTs = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTs = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (aTs !== bTs) return aTs - bTs;
        return b.score - a.score;
      }),
    [tierFilteredItems]
  );

  const overdueItems = useMemo(() => {
    const filtered = timelineItems.filter(
      (item) => item.dueAt && isPast(item.dueAt) && !isToday(item.dueAt)
    );
    return [...filtered].sort(compareAttentionItemsByTierScoreDue);
  }, [timelineItems]);
  const todayItems = useMemo(
    () => timelineItems.filter((item) => item.dueAt && isToday(item.dueAt)),
    [timelineItems]
  );
  const upcomingItems = useMemo(
    () =>
      timelineItems.filter(
        (item) =>
          item.dueAt == null ||
          (!isToday(item.dueAt) && !isPast(item.dueAt))
      ),
    [timelineItems]
  );

  const focusItems = useMemo(() => {
    if (tierFilteredItems.length === 0) return null;
    const urgencyRank: Record<ContactUrgencyTier, number> = {
      immediate: 0,
      priority: 1,
      planned: 2,
      backlog: 3,
    };
    const ranked = [...tierFilteredItems].sort((a, b) => {
      const tierDiff = urgencyRank[a.urgency] - urgencyRank[b.urgency];
      if (tierDiff !== 0) return tierDiff;
      if (b.score !== a.score) return b.score - a.score;
      const at = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bt = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
    const showQueue = visibleUrgencyTiers.size === 4;
    return ranked.slice(0, showQueue ? 8 : 1);
  }, [tierFilteredItems, visibleUrgencyTiers]);

  const scheduleItems = useMemo(() => {
    const rows: ScheduleRow[] = [];
    overdueItems.forEach((item) => rows.push({ ...item, bucket: "overdue" }));
    todayItems.forEach((item) => rows.push({ ...item, bucket: "today" }));
    upcomingItems.forEach((item) => rows.push({ ...item, bucket: "upcoming" }));
    return rows.slice(0, 12);
  }, [overdueItems, todayItems, upcomingItems]);

  /** Contacts with at least one open task — horizontal strip below focus carousel. */
  const radarItems = useMemo(() => {
    const byContact = new Map<string, ContactTask[]>();
    openContactTasks.forEach((task) => {
      const list = byContact.get(task.contact_id) ?? [];
      list.push(task);
      byContact.set(task.contact_id, list);
    });

    return Array.from(byContact.entries())
      .map(([contactId, tasks]) => {
        const sorted = [...tasks].sort((a, b) => {
          const at = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
          const bt = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
          return at - bt;
        });
        const representative = sorted[0];
        const dueAt = representative.due_at ? new Date(representative.due_at) : null;
        const contactName = contactNameById.get(contactId) ?? "Contact";
        const hasSequence = tasks.some((t) => Boolean(t.sequence_enrollment_id));

        const dueText =
          dueAt == null
            ? "No due date"
            : isPast(dueAt) && !isToday(dueAt)
              ? `Overdue since ${format(dueAt, "EEE d MMM")}`
              : isToday(dueAt)
                ? `Due today at ${format(dueAt, "h:mm a")}`
                : `${formatDistanceToNow(dueAt, { addSuffix: true })}`;

        return {
          contactId,
          contactName,
          taskTitle: representative.title,
          taskCount: tasks.length,
          hasSequence,
          dueAt,
          dueText,
          urgency: urgencyByContactId.get(contactId)?.tier ?? ("backlog" as ContactUrgencyTier),
        };
      })
      .sort((a, b) => {
        const at = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bt = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return at - bt;
      });
  }, [openContactTasks, contactNameById, urgencyByContactId]);

  const handleOpenItem = useCallback(
    (item: AttentionItem) => {
      if (item.kind === "appointment") {
        navigate("/appointments");
        return;
      }
      if (item.contactId) {
        navigate(item.kind === "sequenceTask" ? `/contacts/${item.contactId}?nurtureFocus=1` : `/contacts/${item.contactId}`);
        return;
      }
      navigate("/tasks");
    },
    [navigate]
  );

  const handleAdd = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) {
      toast({ title: "Title required", description: "Please enter a title.", variant: "destructive" });
      return;
    }
    try {
      if (addType === "todo") {
        await addTodo.mutateAsync({
          title,
          due_at: isoFromLocalDateTime(newDueAt),
        });
      } else {
        if (!newContactId) {
          toast({ title: "Contact required", description: "Select a contact for this task.", variant: "destructive" });
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
      toast({ title: "Added", description: addType === "todo" ? "General task added." : "Contact task added." });
    } catch (error) {
      toast({ title: "Add failed", description: getErrorMessage(error), variant: "destructive" });
    }
  }, [addTodo, addType, createContactTask, newContactId, newDueAt, newTitle, toast]);

  const focusCarouselPlugins = useHubWheelGesturesPlugins();

  if (visibleItems.length === 0) {
    return (
      <Card className="zoho-card border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          Focus
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Queue clear. Great work.</p>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="zoho-card border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Focus
          </p>
          <Badge variant="outline" className="border-border/80 text-[11px]">
            {visibleItems.length} in queue
          </Badge>
        </div>

        <Collapsible className="group mb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
              Filter &amp; add
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 rounded-lg border border-border/70 bg-card/45 p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() =>
                  setVisibleUrgencyTiers(new Set<ContactUrgencyTier>(["immediate", "priority", "planned", "backlog"]))
                }
              >
                All
              </Button>
              {(["immediate", "priority", "planned", "backlog"] as ContactUrgencyTier[]).map((tier) => (
                <Button
                  key={tier}
                  size="sm"
                  variant={visibleUrgencyTiers.has(tier) ? "default" : "outline"}
                  className="h-7 px-2 text-[11px]"
                  onClick={() =>
                    setVisibleUrgencyTiers((prev) => {
                      const next = new Set(prev);
                      if (next.has(tier)) {
                        if (next.size === 1) return prev;
                        next.delete(tier);
                      } else {
                        next.add(tier);
                      }
                      return next;
                    })
                  }
                >
                  {urgencyTierLabel(tier)}
                </Button>
              ))}
            </div>
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
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {getContactDisplayName(contact)}
                    </option>
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

        {focusItems?.length ? (
          <div className="touch-pan-x mb-3 w-full min-w-0">
            <Carousel opts={HUB_CAROUSEL_OPTS} plugins={focusCarouselPlugins} className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {focusItems.map((focusItem, idx) => (
                  <CarouselItem key={focusItem.id} className={FOCUS_CARD_SLIDE_CLASS}>
                    <div
                      className={cn(
                        FOCUS_CARD_HEIGHT_CLASS,
                        "flex cursor-pointer flex-row gap-2 overflow-hidden rounded-xl border p-2.5 shadow-sm transition-colors hover:bg-accent/20",
                        urgencyTierSpotlightCardClass(focusItem.urgency),
                        idx === 0 && focusItem.urgency === "immediate" && "animate-pulse",
                      )}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenItem(focusItem)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleOpenItem(focusItem);
                        }
                      }}
                    >
                      <div
                        className={cn("w-1 shrink-0 self-stretch rounded-full", urgencyTierSpotlightRailClass(focusItem.urgency))}
                      />
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">
                            {focusItem.kind === "todoTask" ? focusItem.title : focusItem.detail}
                          </p>
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">
                            {focusItem.kind === "todoTask" ? "General task" : focusItem.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge variant="outline" className="border-border/80 text-[10px]">
                              {kindBadgeLabel(focusItem.kind)}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[10px]", urgencyTierBadgeClass(focusItem.urgency))}>
                              {urgencyTierLabel(focusItem.urgency)}
                            </Badge>
                            <Badge variant="outline" className="max-w-full truncate border-border/80 text-[10px]">
                              {focusItem.whenText}
                            </Badge>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="line-clamp-1 cursor-default text-[11px] text-muted-foreground">
                                {focusItem.reason}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs text-xs">
                              {focusItem.reason}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex justify-end">
                          {focusItem.canComplete && focusItem.kind !== "appointment" ? (
                            <Button
                              size="sm"
                              className="h-7 gap-1 px-2.5 text-[11px] font-semibold shadow-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(hrefForWorkNow({
                                  kind: focusItem.kind,
                                  contactId: focusItem.contactId,
                                  contactTaskId: focusItem.contactTaskId,
                                  todoId: focusItem.todoId,
                                  appointmentId: focusItem.appointmentId,
                                }));
                              }}
                            >
                              <Briefcase className="size-3 opacity-90" aria-hidden />
                              Work now
                            </Button>
                          ) : focusItem.kind === "appointment" ? (
                            <Button
                              size="sm"
                              className="h-7 gap-1 px-2.5 text-[11px] font-semibold shadow-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(
                                  hrefForWorkNow({
                                    kind: "appointment",
                                    appointmentId: focusItem.appointmentId,
                                    contactId: focusItem.contactId,
                                  }),
                                );
                              }}
                            >
                              <CalendarClock className="size-3 opacity-90" aria-hidden />
                              Prep
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        ) : null}

        {radarItems.length > 0 ? (
          <div className="mb-3">
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Radio className="h-3.5 w-3.5 shrink-0 text-primary" />
                On my radar
              </p>
              <Badge variant="outline" className="border-border/60 px-2 py-0 text-[10px]">
                {radarItems.length} contact{radarItems.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto overflow-y-visible pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-0 [&::-webkit-scrollbar]:hidden">
              {radarItems.map((radar) => {
                const urgencyDot = urgencyDotClass(radar.urgency);
                const urgencyText =
                  radar.urgency === "immediate"
                    ? "text-red-300"
                    : radar.urgency === "priority"
                      ? "text-amber-300"
                      : radar.urgency === "planned"
                        ? "text-sky-300"
                        : "text-emerald-300";
                return (
                  <div
                    key={radar.contactId}
                    className="min-w-[min(100%,260px)] max-w-[min(92vw,300px)] shrink-0 sm:min-w-[240px]"
                  >
                    <div className="flex h-full min-h-[6.5rem] flex-col justify-between gap-2 rounded-lg border border-border/70 bg-background/55 px-3 py-2.5 shadow-sm">
                      <div className="flex items-start gap-2">
                        <span className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background", urgencyDot)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">{radar.contactName}</p>
                          <p className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground">
                            {radar.hasSequence ? "Sequence · " : ""}
                            {radar.taskTitle}
                            {radar.taskCount > 1 ? ` (+${radar.taskCount - 1} more)` : ""}
                          </p>
                          <p className={cn("mt-0.5 text-[11px] font-medium", urgencyText)}>{radar.dueText}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 w-full shrink-0 text-[11px] sm:w-auto sm:self-end"
                        onClick={() => navigate(`/contacts/${radar.contactId}`)}
                      >
                        Open contact
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <HubScheduleStrip
          items={scheduleItems}
          overdueCount={overdueItems.length}
          todayCount={todayItems.length}
          upcomingCount={upcomingItems.length}
          onOpen={handleOpenItem}
        />
      </Card>
    </TooltipProvider>
  );
}
