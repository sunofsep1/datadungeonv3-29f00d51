import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Pencil,
  Radio,
  Sparkles,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAppointments } from "@/hooks/useAppointments";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { useContactUrgency } from "@/hooks/useContactUrgency";
import {
  useOpenContactTasksForUser,
  useUpdateContactTask,
  useCreateContactTask,
  useDeleteContactTask,
  type ContactTask,
} from "@/hooks/useContactTasks";
import {
  usePendingStepRunsByTaskIds,
  useCompleteNurtureStepAndAdvance,
  isNurtureNoActiveStepError,
} from "@/hooks/useNurtureSequences";
import { useTodos, useUpdateTodo, useAddTodo, useDeleteTodo, type Todo } from "@/hooks/useTodos";
import { hrefForWorkshop } from "@/lib/attentionWorkWorkspace";
import { useDrako } from "@/components/drako";
import { useDrakoProgress } from "@/hooks/useDrakoProgress";
import { recordDrakoActivity } from "@/lib/drakoActivity";
import { pickDrakoLine } from "@/lib/drakoDialogue";
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

function localDateTimeFromIso(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** Shared Embla options — drag-free + wheel-gestures feels fast/snappy vs native overflow scroll. */
const HUB_CAROUSEL_OPTS = {
  align: "start" as const,
  dragFree: true,
  containScroll: false,
};

/** Same slide width for Focus + timeline carousels (responsive cap). */
const HUB_CARD_SLIDE_CLASS =
  "w-[min(calc(100vw-2.5rem),300px)] min-w-[280px] max-w-[300px] shrink-0 basis-[min(calc(100vw-2.5rem),300px)] pl-2 md:pl-4";

/** Uniform tile height; inner body scrolls so dense rows stay aligned. */
const HUB_CARD_HEIGHT_CLASS = "h-[min(380px,78vh)]";

/** Each carousel gets its own plugin instance (Embla initializes plugins per root). */
function useHubWheelGesturesPlugins() {
  return useMemo(() => [WheelGesturesPlugin({ forceWheelAxis: "x" })], []);
}

/** Overdue / Today / Upcoming — same Embla behavior as focus strip. */
function HubTimelineStrip({
  title,
  items,
  emptyText,
  renderCard,
}: {
  title: string;
  items: AttentionItem[];
  emptyText: string;
  renderCard: (item: AttentionItem) => ReactNode;
}) {
  const hubCarouselPlugins = useHubWheelGesturesPlugins();

  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-card/45 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
        <Badge variant="outline" className="text-[10px] border-border/70">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="touch-pan-x w-full min-w-0">
          <Carousel opts={HUB_CAROUSEL_OPTS} plugins={hubCarouselPlugins} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {items.map((item) => (
                <CarouselItem key={item.id} className={HUB_CARD_SLIDE_CLASS}>
                  {renderCard(item)}
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      )}
    </div>
  );
}

export function AttentionHubWidget() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();
  const { data: openContactTasks = [] } = useOpenContactTasksForUser();
  const { data: todos = [] } = useTodos();
  const { urgencyByContactId } = useContactUrgency();

  const updateTodo = useUpdateTodo();
  const addTodo = useAddTodo();
  const deleteTodo = useDeleteTodo();
  const updateContactTask = useUpdateContactTask();
  const createContactTask = useCreateContactTask();
  const deleteContactTask = useDeleteContactTask();
  const completeNurtureStep = useCompleteNurtureStepAndAdvance();
  const { setMood } = useDrako();
  const { grantXp } = useDrakoProgress();

  /** Drako reaction + XP + quest progress when a queue item is cleared. */
  const rewardCompletion = useCallback(
    (kind: "todo" | "contact" | "nurture") => {
      if (kind === "nurture") {
        grantXp("nurtureStep");
        recordDrakoActivity("nurtureStep");
        setMood("wave", { caption: pickDrakoLine("nurtureStep") });
        return;
      }
      grantXp(kind === "contact" ? "contactTaskDone" : "taskDone");
      recordDrakoActivity("taskComplete");
      setMood("celebrate", { caption: pickDrakoLine("taskDone") });
    },
    [grantXp, setMood],
  );

  const sequenceTaskIds = useMemo(
    () => openContactTasks.filter((task) => Boolean(task.sequence_enrollment_id)).map((task) => task.id),
    [openContactTasks]
  );
  const { data: pendingStepRuns = [] } = usePendingStepRunsByTaskIds(sequenceTaskIds);

  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);
  const [completingItemId, setCompletingItemId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [hiddenItemIds, setHiddenItemIds] = useState<string[]>([]);
  const [noteItemId, setNoteItemId] = useState<string | null>(null);
  const [quickNote, setQuickNote] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
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

  const pendingStepByTaskId = useMemo(() => {
    const map = new Map<string, (typeof pendingStepRuns)[number]>();
    pendingStepRuns.forEach((run) => {
      if (run.task_id) map.set(run.task_id, run);
    });
    return map;
  }, [pendingStepRuns]);

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

  const criticalCount = visibleItems.filter((item) => item.urgency === "immediate").length;
  const highCount = visibleItems.filter((item) => item.urgency === "priority").length;
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

  const handleComplete = useCallback(
    async (item: AttentionItem, note?: string) => {
      setCompletingItemId(item.id);
      try {
        if (item.kind === "todoTask" && item.todoId) {
          await updateTodo.mutateAsync({ id: item.todoId, completed: true });
          setHiddenItemIds((prev) => [...prev, item.id]);
          setSessionCompletedCount((prev) => prev + 1);
          setCelebrating(true);
          rewardCompletion("todo");
          toast({ title: "Completed", description: "Task marked as done." });
          return;
        }

        if ((item.kind === "contactTask" || item.kind === "sequenceTask") && item.contactTaskId && item.contactId) {
          const run = pendingStepByTaskId.get(item.contactTaskId);
          if (item.sequenceEnrollmentId && run) {
            try {
              await completeNurtureStep.mutateAsync({
                enrollment_id: run.enrollment_id,
                step_run_id: run.id,
                contact_id: item.contactId,
                contact_task_id: item.contactTaskId,
                outcome: "completed",
                engagement_note: note?.trim() || undefined,
              });
              setHiddenItemIds((prev) => [...prev, item.id]);
              setSessionCompletedCount((prev) => prev + 1);
              setCelebrating(true);
              rewardCompletion("nurture");
              toast({ title: "Step completed", description: "Nurture moved to the next step." });
              return;
            } catch (sequenceError) {
              if (isNurtureNoActiveStepError(sequenceError)) {
                await updateContactTask.mutateAsync({
                  id: item.contactTaskId,
                  contact_id: item.contactId,
                  completed_at: new Date().toISOString(),
                  completion_note: note?.trim() || null,
                });
                setHiddenItemIds((prev) => [...prev, item.id]);
                setSessionCompletedCount((prev) => prev + 1);
                setCelebrating(true);
                rewardCompletion("nurture");
                toast({
                  title: "Task completed",
                  description:
                    "The nurture sequence had already moved on; your task is marked done.",
                });
                return;
              }
              await updateContactTask.mutateAsync({
                id: item.contactTaskId,
                contact_id: item.contactId,
                completed_at: new Date().toISOString(),
                completion_note: note?.trim() || null,
              });
              setHiddenItemIds((prev) => [...prev, item.id]);
              setSessionCompletedCount((prev) => prev + 1);
              setCelebrating(true);
              rewardCompletion("nurture");
              toast({
                title: "Task completed",
                description: `Step sync failed (${getErrorMessage(sequenceError)}). Task was still marked done.`,
              });
              return;
            }
          }
          await updateContactTask.mutateAsync({
            id: item.contactTaskId,
            contact_id: item.contactId,
            completed_at: new Date().toISOString(),
            completion_note: note?.trim() || null,
          });
          setHiddenItemIds((prev) => [...prev, item.id]);
          setSessionCompletedCount((prev) => prev + 1);
          setCelebrating(true);
          rewardCompletion("contact");
          toast({ title: "Completed", description: "Contact task marked as done." });
        }
      } catch (error) {
        const description = getErrorMessage(error);
        toast({ title: "Action failed", description, variant: "destructive" });
      } finally {
        setCompletingItemId(null);
        setNoteItemId(null);
        setQuickNote("");
      }
    },
    [completeNurtureStep, pendingStepByTaskId, rewardCompletion, toast, updateContactTask, updateTodo]
  );

  const beginEdit = useCallback((item: AttentionItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.kind === "todoTask" ? item.title : item.detail);
    setEditDueAt(localDateTimeFromIso(item.dueAt ? item.dueAt.toISOString() : null));
  }, []);

  const saveEdit = useCallback(
    async (item: AttentionItem) => {
      const title = editTitle.trim();
      if (!title) {
        toast({ title: "Title required", description: "Please enter a title.", variant: "destructive" });
        return;
      }
      try {
        if (item.kind === "todoTask" && item.todoId) {
          await updateTodo.mutateAsync({
            id: item.todoId,
            title,
            due_at: isoFromLocalDateTime(editDueAt),
          });
        } else if (item.kind === "contactTask" && item.contactTaskId && item.contactId) {
          await updateContactTask.mutateAsync({
            id: item.contactTaskId,
            contact_id: item.contactId,
            title,
            due_at: isoFromLocalDateTime(editDueAt),
          });
        } else {
          return;
        }
        setEditingItemId(null);
        setEditTitle("");
        setEditDueAt("");
        toast({ title: "Updated", description: "Item updated successfully." });
      } catch (error) {
        toast({ title: "Update failed", description: getErrorMessage(error), variant: "destructive" });
      }
    },
    [editDueAt, editTitle, toast, updateContactTask, updateTodo]
  );

  const handleDelete = useCallback(
    async (item: AttentionItem) => {
      setDeletingItemId(item.id);
      try {
        if (item.kind === "todoTask" && item.todoId) {
          await deleteTodo.mutateAsync(item.todoId);
        } else if (item.kind === "contactTask" && item.contactTaskId && item.contactId) {
          await deleteContactTask.mutateAsync({ id: item.contactTaskId, contact_id: item.contactId });
        } else {
          return;
        }
        setHiddenItemIds((prev) => [...prev, item.id]);
        toast({ title: "Deleted", description: "Item removed from the hub." });
      } catch (error) {
        toast({ title: "Delete failed", description: getErrorMessage(error), variant: "destructive" });
      } finally {
        setDeletingItemId(null);
      }
    },
    [deleteContactTask, deleteTodo, toast]
  );

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

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 850);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  const focusCarouselPlugins = useHubWheelGesturesPlugins();

  if (visibleItems.length === 0) {
    return (
      <Card className="zoho-card p-4 border border-emerald-400/20 bg-emerald-500/[0.06]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Attention Hub
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Queue clear. Great work.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-emerald-200/90">Completed this session</p>
            <p className="text-lg font-bold text-emerald-100">{sessionCompletedCount}</p>
          </div>
        </div>
      </Card>
    );
  }

  const renderOneTimelineCard = (item: AttentionItem) => {
    const isAppointment = item.kind === "appointment";
    const dueIcon =
      item.kind === "appointment" ? CalendarClock : item.urgency === "immediate" ? AlertTriangle : Clock;
    const DueIcon = dueIcon;
    const isNoteOpen = noteItemId === item.id;
    const canEdit = item.kind === "todoTask" || item.kind === "contactTask";
    const canDelete = item.kind === "todoTask" || item.kind === "contactTask";
    const isEditing = editingItemId === item.id;
    const workHref = hrefForWorkshop(item);
    return (
      <div
        className={cn(
          HUB_CARD_HEIGHT_CLASS,
          "flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background/55 px-3 py-3 shadow-sm",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[10px] border-border/80">
              {kindBadgeLabel(item.kind)}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", urgencyTierBadgeClass(item.urgency))}>
              {urgencyTierLabel(item.urgency)}
            </Badge>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">{item.title}</p>
            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{item.detail}</p>
            <p className="flex items-start gap-1 text-[11px] leading-snug text-muted-foreground">
              <DueIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">{item.whenText}</span>
            </p>
            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground" title={item.reason}>
              {item.reason}
            </p>
          </div>
          {isEditing ? (
          <div className="rounded-md border border-border/70 bg-muted/20 p-2">
            <p className="mb-1.5 text-[11px] text-muted-foreground">Edit item</p>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_190px_auto_auto]">
              <Input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="h-8 text-xs"
                placeholder="Title"
              />
              <Input
                type="datetime-local"
                value={editDueAt}
                onChange={(event) => setEditDueAt(event.target.value)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-[11px]"
                onClick={() => {
                  setEditingItemId(null);
                  setEditTitle("");
                  setEditDueAt("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" className="h-8 px-2 text-[11px]" onClick={() => saveEdit(item)}>
                Save
              </Button>
            </div>
          </div>
          ) : null}
          {isNoteOpen ? (
          <div className="rounded-md border border-border/70 bg-muted/20 p-2">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MessageSquareText className="h-3.5 w-3.5" />
              Optional note (recommended for contact/sequence context)
            </div>
            <Textarea
              value={quickNote}
              onChange={(event) => setQuickNote(event.target.value)}
              placeholder="Outcome, next step, or blocker..."
              className="min-h-[70px] text-xs"
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  setNoteItemId(null);
                  setQuickNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                disabled={completingItemId === item.id}
                onClick={() => handleComplete(item)}
              >
                Skip note
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={completingItemId === item.id}
                onClick={() => handleComplete(item, quickNote)}
              >
                Save + complete
              </Button>
            </div>
          </div>
          ) : null}
        </div>
        <div className="mt-auto -mx-3 -mb-3 shrink-0 rounded-b-xl border-t border-border/50 bg-muted/25 px-3 pb-3 pt-2 dark:bg-muted/15">
          {/* Single row: primary stays right in dev & prod (no flex-wrap jump). Narrow viewports scroll horizontally. */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 shrink-0 gap-1.5 px-2.5 text-xs font-medium shadow-none"
                onClick={() => handleOpenItem(item)}
              >
                <ExternalLink className="size-3.5 shrink-0 opacity-90" aria-hidden />
                Open
              </Button>
              {workHref ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 gap-1.5 border-primary/25 bg-primary/[0.06] px-2.5 text-xs font-medium hover:bg-primary/10"
                  onClick={() => navigate(workHref)}
                >
                  <Briefcase className="size-3.5 shrink-0 text-primary/90" aria-hidden />
                  Work
                </Button>
              ) : null}

              {(canEdit || canDelete) && (
                <div className="flex shrink-0 items-center gap-0 rounded-md border border-border/60 bg-background/70 p-0.5 shadow-sm">
                  {canEdit ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => beginEdit(item)}
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Edit task</TooltipContent>
                    </Tooltip>
                  ) : null}
                  {canDelete ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={deletingItemId === item.id}
                          onClick={() => handleDelete(item)}
                        >
                          {deletingItemId === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end pl-1">
              {isAppointment ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs font-semibold shadow-sm"
                  onClick={() => navigate("/appointments")}
                >
                  <CalendarClock className="size-3.5 opacity-90" aria-hidden />
                  Prep
                </Button>
              ) : item.canComplete ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs font-semibold shadow-sm"
                  disabled={completingItemId !== null && completingItemId !== item.id}
                  onClick={() => {
                    setNoteItemId(item.id);
                    setQuickNote("");
                  }}
                >
                  {completingItemId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-3.5 opacity-90" aria-hidden />
                  )}
                  Complete
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
    <Card className="zoho-card p-4 border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Do This Next
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Drag or trackpad-scroll sideways · sections below scroll the same way.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] border-border/80">
            {visibleItems.length} queued
          </Badge>
          {criticalCount > 0 ? (
            <Badge className="text-[11px] bg-orange-600/35 text-orange-50 border-orange-500/55">{criticalCount} immediate</Badge>
          ) : null}
          {highCount > 0 ? (
            <Badge className="text-[11px] bg-amber-500/20 text-amber-200 border-amber-400/35">{highCount} priority</Badge>
          ) : null}
          <Badge
            className={cn(
              "text-[11px] border border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
              celebrating && "scale-105 transition-transform duration-200"
            )}
          >
            done {sessionCompletedCount}
          </Badge>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-border/70 bg-card/45 p-2.5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={() => setVisibleUrgencyTiers(new Set<ContactUrgencyTier>(["immediate", "priority", "planned", "backlog"]))}
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
        <Collapsible className="group space-y-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
              Quick add task
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)_190px_170px_auto]">
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
              {addTodo.isPending || createContactTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {focusItems?.length ? (
        <div className="touch-pan-x mb-3 w-full min-w-0">
          <Carousel opts={HUB_CAROUSEL_OPTS} plugins={focusCarouselPlugins} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {focusItems.map((focusItem, idx) => (
                <CarouselItem key={focusItem.id} className={HUB_CARD_SLIDE_CLASS}>
                  <div
                    className={cn(
                      HUB_CARD_HEIGHT_CLASS,
                      "flex cursor-pointer flex-col overflow-hidden rounded-xl border p-3 shadow-sm transition-colors hover:bg-accent/20",
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
                    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
                      <div className={cn("w-1.5 shrink-0 rounded-full", urgencyTierSpotlightRailClass(focusItem.urgency))} />
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto">
                        <p className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                          Focus · {idx + 1}/{focusItems.length}
                        </p>
                        <p className="line-clamp-2 text-lg font-bold leading-snug text-foreground">
                          {focusItem.kind === "todoTask" ? focusItem.title : focusItem.detail}
                        </p>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          {focusItem.kind === "todoTask" ? "General task" : focusItem.title}
                        </p>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] border-border/80">
                            {kindBadgeLabel(focusItem.kind)}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px]", urgencyTierBadgeClass(focusItem.urgency))}>
                            {urgencyTierLabel(focusItem.urgency)}
                          </Badge>
                          <Badge variant="outline" className="max-w-full truncate text-[10px] border-border/80">
                            {focusItem.whenText}
                          </Badge>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="line-clamp-3 cursor-default text-xs leading-snug text-muted-foreground">
                              {focusItem.reason}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs text-xs">
                            {focusItem.reason}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="mt-auto -mx-3 -mb-3 flex shrink-0 justify-end rounded-b-xl border-t border-border/50 bg-muted/25 px-3 pb-3 pt-2 dark:bg-muted/15">
                      {focusItem.canComplete && focusItem.kind !== "appointment" ? (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 px-3 text-xs font-semibold shadow-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            const href = hrefForWorkshop(focusItem);
                            if (href) navigate(href);
                            else handleOpenItem(focusItem);
                          }}
                        >
                          <Briefcase className="size-3.5 opacity-90" aria-hidden />
                          Work now
                        </Button>
                      ) : focusItem.kind === "appointment" ? (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 px-3 text-xs font-semibold shadow-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            const href = hrefForWorkshop({
                              kind: "appointment",
                              appointmentId: focusItem.appointmentId,
                              contactId: focusItem.contactId,
                            });
                            if (href) navigate(href);
                            else navigate("/appointments");
                          }}
                        >
                          <CalendarClock className="size-3.5 opacity-90" aria-hidden />
                          Prep now
                        </Button>
                      ) : null}
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
              const urgencyDot =
                radar.urgency === "immediate"
                  ? "bg-red-400"
                  : radar.urgency === "priority"
                    ? "bg-amber-400"
                    : radar.urgency === "planned"
                      ? "bg-sky-400"
                      : "bg-emerald-400";
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

      <div className="space-y-2.5">
        <HubTimelineStrip title="Overdue" items={overdueItems} emptyText="No overdue actions." renderCard={renderOneTimelineCard} />
        <HubTimelineStrip title="Today" items={todayItems} emptyText="Nothing due today yet." renderCard={renderOneTimelineCard} />
        <HubTimelineStrip
          title="Upcoming"
          items={upcomingItems}
          emptyText="No upcoming reminders in range."
          renderCard={renderOneTimelineCard}
        />
      </div>
    </Card>
    </TooltipProvider>
  );
}
