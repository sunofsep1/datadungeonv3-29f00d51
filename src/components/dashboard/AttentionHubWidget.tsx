import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquareText,
  Sparkles,
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
import { usePendingStepRunsByTaskIds, useCompleteNurtureStepAndAdvance } from "@/hooks/useNurtureSequences";
import { useTodos, useUpdateTodo, useAddTodo, useDeleteTodo, type Todo } from "@/hooks/useTodos";
import { cn } from "@/lib/utils";
import type { ContactUrgencyTier } from "@/lib/contactUrgency";

type AttentionItemKind = "sequenceTask" | "contactTask" | "todoTask" | "appointment" | "contactReminder";
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
  if (kind === "contactReminder") return "Contact";
  if (kind === "todoTask") return "General";
  return "Appointment";
}

function urgencyBadgeClass(urgency: AttentionItemUrgency): string {
  if (urgency === "immediate") return "bg-red-500/15 text-red-300 border-red-400/35";
  if (urgency === "priority") return "bg-amber-500/15 text-amber-200 border-amber-400/35";
  if (urgency === "planned") return "bg-sky-500/15 text-sky-200 border-sky-400/35";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-400/35";
}

function spotlightCardClass(urgency: AttentionItemUrgency): string {
  if (urgency === "immediate") return "border-red-400/45 bg-gradient-to-r from-red-500/20 via-red-500/8 to-background";
  if (urgency === "priority") return "border-amber-400/45 bg-gradient-to-r from-amber-500/20 via-amber-500/8 to-background";
  if (urgency === "planned") return "border-sky-400/45 bg-gradient-to-r from-sky-500/20 via-sky-500/8 to-background";
  return "border-emerald-400/45 bg-gradient-to-r from-emerald-500/20 via-emerald-500/8 to-background";
}

function spotlightRailClass(urgency: AttentionItemUrgency): string {
  if (urgency === "immediate") return "bg-red-400";
  if (urgency === "priority") return "bg-amber-400";
  if (urgency === "planned") return "bg-sky-400";
  return "bg-emerald-400";
}

function urgencyLabel(urgency: AttentionItemUrgency): string {
  if (urgency === "immediate") return "Immediate";
  if (urgency === "priority") return "Priority";
  if (urgency === "planned") return "Planned";
  return "Backlog";
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
    () => new Set<ContactUrgencyTier>(["immediate", "priority"])
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
    const contactIdsWithActionItems = new Set<string>();

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
      contactIdsWithActionItems.add(task.contact_id);
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
        if (appointment.contact_id) contactIdsWithActionItems.add(appointment.contact_id);
      });

    contacts.forEach((contact) => {
      if (contactIdsWithActionItems.has(contact.id)) return;
      const contactUrgency = urgencyByContactId.get(contact.id);
      if (!contactUrgency) return;

      const nextTouchRaw = (contact as { next_touch_date?: string | null }).next_touch_date;
      const nextTouchDate = nextTouchRaw ? new Date(nextTouchRaw) : null;
      const dueAt = nextTouchDate && !Number.isNaN(nextTouchDate.getTime()) ? nextTouchDate : null;
      const contactName = getContactDisplayName(contact);

      const whenText =
        dueAt == null
          ? "No next touch date set"
          : isPast(dueAt) && !isToday(dueAt)
            ? `Touch overdue since ${format(dueAt, "EEE d MMM")}`
            : isToday(dueAt)
              ? `Touch due today at ${format(dueAt, "h:mm a")}`
              : `Touch ${formatDistanceToNow(dueAt, { addSuffix: true })}`;

      nextItems.push({
        id: `contact-reminder-${contact.id}`,
        kind: "contactReminder",
        urgency: contactUrgency.tier,
        score: contactUrgency.score + 6,
        title: contactName,
        detail: "Relationship follow-up reminder",
        whenText,
        dueAt,
        contactId: contact.id,
        canComplete: false,
        reason: contactUrgency.reasons[0] ?? "Manual/derived urgency indicates this contact should stay active.",
      });
    });

    return nextItems
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const at = a.dueAt ? a.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
        const bt = b.dueAt ? b.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
        return at - bt;
      })
      .slice(0, 12);
  }, [appointments, contacts, contactNameById, openContactTasks, todos, urgencyByContactId]);

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

  const overdueItems = useMemo(
    () => timelineItems.filter((item) => item.dueAt && isPast(item.dueAt) && !isToday(item.dueAt)),
    [timelineItems]
  );
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
    return ranked.slice(0, showQueue ? 4 : 1);
  }, [tierFilteredItems, visibleUrgencyTiers]);

  const handleComplete = useCallback(
    async (item: AttentionItem, note?: string) => {
      setCompletingItemId(item.id);
      try {
        if (item.kind === "todoTask" && item.todoId) {
          await updateTodo.mutateAsync({ id: item.todoId, completed: true });
          setHiddenItemIds((prev) => [...prev, item.id]);
          setSessionCompletedCount((prev) => prev + 1);
          setCelebrating(true);
          toast({ title: "Completed", description: "Task marked as done." });
          return;
        }

        if ((item.kind === "contactTask" || item.kind === "sequenceTask") && item.contactTaskId && item.contactId) {
          const run = pendingStepByTaskId.get(item.contactTaskId);
          if (item.sequenceEnrollmentId && run) {
            try {
              await completeNurtureStep.mutateAsync({
                enrollment_id: item.sequenceEnrollmentId,
                step_run_id: run.id,
                contact_id: item.contactId,
                outcome: "completed",
                engagement_note: note?.trim() || undefined,
              });
              setHiddenItemIds((prev) => [...prev, item.id]);
              setSessionCompletedCount((prev) => prev + 1);
              setCelebrating(true);
              toast({ title: "Step completed", description: "Nurture moved to the next step." });
              return;
            } catch (sequenceError) {
              await updateContactTask.mutateAsync({
                id: item.contactTaskId,
                contact_id: item.contactId,
                completed_at: new Date().toISOString(),
                completion_note: note?.trim() || null,
              });
              setHiddenItemIds((prev) => [...prev, item.id]);
              setSessionCompletedCount((prev) => prev + 1);
              setCelebrating(true);
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
    [completeNurtureStep, pendingStepByTaskId, toast, updateContactTask, updateTodo]
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

  const renderTimelineSection = (title: string, items: AttentionItem[], emptyText: string) => (
    <div className="rounded-lg border border-border/70 bg-card/45 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
        <Badge variant="outline" className="text-[10px] border-border/70">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const isAppointment = item.kind === "appointment";
            const dueIcon = item.kind === "appointment" ? CalendarClock : item.urgency === "immediate" ? AlertTriangle : Clock;
            const DueIcon = dueIcon;
            const isNoteOpen = noteItemId === item.id;
            const canEdit = item.kind === "todoTask" || item.kind === "contactTask";
            const canDelete = item.kind === "todoTask" || item.kind === "contactTask";
            const isEditing = editingItemId === item.id;
            return (
              <li key={item.id}>
                <div className="rounded-md border border-border/70 bg-background/55 px-2.5 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] border-border/80">
                          {kindBadgeLabel(item.kind)}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px]", urgencyBadgeClass(item.urgency))}>
                          {urgencyLabel(item.urgency)}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-foreground">{item.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{item.detail}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <DueIcon className="h-3.5 w-3.5 shrink-0" />
                        {item.whenText}
                      </p>
                      <p className="truncate text-[11px] text-primary/90">{item.reason}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => {
                          if (item.kind === "appointment") {
                            navigate("/appointments");
                            return;
                          }
                          if (item.contactId) {
                            navigate(item.kind === "sequenceTask" ? `/contacts/${item.contactId}?nurtureFocus=1` : `/contacts/${item.contactId}`);
                            return;
                          }
                          navigate("/tasks");
                        }}
                      >
                        Open
                      </Button>
                      {canEdit ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => beginEdit(item)}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          disabled={deletingItemId === item.id}
                          onClick={() => handleDelete(item)}
                        >
                          {deletingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
                        </Button>
                      ) : null}
                      {isAppointment ? (
                        <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => navigate("/appointments")}>
                          Prep
                        </Button>
                      ) : item.canComplete ? (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          disabled={completingItemId !== null && completingItemId !== item.id}
                          onClick={() => {
                            setNoteItemId(item.id);
                            setQuickNote("");
                          }}
                        >
                          {completingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Complete"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="mt-2 rounded-md border border-border/70 bg-muted/20 p-2">
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
                        <Button
                          size="sm"
                          className="h-8 px-2 text-[11px]"
                          onClick={() => saveEdit(item)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {isNoteOpen ? (
                    <div className="mt-2 rounded-md border border-border/70 bg-muted/20 p-2">
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <Card className="zoho-card p-4 border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Daily Attention Hub
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Timeline view: overdue first, then today, then upcoming.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] border-border/80">
            {visibleItems.length} queued
          </Badge>
          {criticalCount > 0 ? (
            <Badge className="text-[11px] bg-red-500/20 text-red-200 border-red-400/35">{criticalCount} immediate</Badge>
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
              {urgencyLabel(tier)}
            </Button>
          ))}
        </div>
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Quick add</p>
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
            {addTodo.isPending || createContactTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
          </Button>
        </div>
      </div>

      {focusItems?.length ? (
        <div className="mb-3 space-y-2">
          {focusItems.map((focusItem, idx) => (
            <div
              key={focusItem.id}
              className={cn(
                "rounded-xl border p-3 shadow-sm",
                spotlightCardClass(focusItem.urgency),
                idx === 0 && focusItem.urgency === "immediate" && "animate-pulse"
              )}
            >
              <div className="flex items-stretch gap-3">
                <div className={cn("w-1.5 rounded-full shrink-0", spotlightRailClass(focusItem.urgency))} />
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {idx === 0 ? "Focus Box" : `Focus #${idx + 1}`}
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground truncate">
                      {focusItem.kind === "todoTask" ? focusItem.title : focusItem.detail}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {focusItem.kind === "todoTask" ? "General task" : focusItem.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] border-border/80">
                        {kindBadgeLabel(focusItem.kind)}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px]", urgencyBadgeClass(focusItem.urgency))}>
                        {urgencyLabel(focusItem.urgency)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-border/80">
                        {focusItem.whenText}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-border/80">
                        {idx === 0 ? "Top priority" : "Next priority"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs font-medium text-primary/95">{focusItem.reason}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => {
                        if (focusItem.kind === "appointment") return navigate("/appointments");
                        if (focusItem.contactId) {
                          return navigate(
                            focusItem.kind === "sequenceTask"
                              ? `/contacts/${focusItem.contactId}?nurtureFocus=1`
                              : `/contacts/${focusItem.contactId}`
                          );
                        }
                        return navigate("/tasks");
                      }}
                    >
                      Open
                    </Button>
                    {focusItem.canComplete && focusItem.kind !== "appointment" ? (
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={completingItemId !== null && completingItemId !== focusItem.id}
                        onClick={() => {
                          setNoteItemId(focusItem.id);
                          setQuickNote("");
                        }}
                      >
                        Work now
                      </Button>
                    ) : focusItem.kind === "appointment" ? (
                      <Button size="sm" className="h-8" onClick={() => navigate("/appointments")}>
                        Prep now
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2.5">
        {renderTimelineSection("Overdue", overdueItems, "No overdue actions.")}
        {renderTimelineSection("Today", todayItems, "Nothing due today yet.")}
        {renderTimelineSection("Upcoming", upcomingItems, "No upcoming reminders in range.")}
      </div>
    </Card>
  );
}
