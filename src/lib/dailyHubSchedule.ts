import { format, formatDistanceToNow, isSameDay, isToday, startOfDay } from "date-fns";
import type { ContactUrgencyResult, ContactUrgencyTier } from "@/lib/contactUrgency";
import { isDueOverdue, isDueToday, parseDateOnlyLocal } from "@/lib/localDateParse";
import { compareAttentionItemsByTierScoreDue } from "@/lib/urgencyTierStyles";

export type DailyHubItemKind =
  | "sequenceTask"
  | "contactTask"
  | "todoTask"
  | "appointment"
  | "nextTouchReminder";

export type DailyHubItem = {
  id: string;
  kind: DailyHubItemKind;
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

/** Start-date buckets: overdue (before today), today, coming up (today+ or unset). */
export type DailyHubScheduleBucket = "overdue" | "today" | "coming_up";

export type DailyHubScheduleRow = DailyHubItem & { bucket: DailyHubScheduleBucket };

type ContactTaskRow = {
  id: string;
  contact_id: string;
  title: string;
  due_at: string | null;
  sequence_enrollment_id: string | null;
  completed_at?: string | null;
};

type TodoRow = {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  due_at: string | null;
};

type AppointmentRow = {
  id: string;
  title: string | null;
  date: string;
  contact_id: string | null;
};

type ContactRow = {
  id: string;
  next_touch_date?: string | null;
};

function fallbackScoreByUrgency(
  dueAt: Date | null,
  kind: DailyHubItemKind,
  priority?: "low" | "medium" | "high",
): { urgency: ContactUrgencyTier; score: number } {
  const now = Date.now();
  const due = dueAt ? dueAt.getTime() : now + 1000 * 60 * 60 * 24 * 14;
  const deltaHours = (due - now) / (1000 * 60 * 60);
  const priorityWeight = priority === "high" ? 20 : priority === "medium" ? 10 : 0;
  const kindWeight =
    kind === "sequenceTask" ? 24 : kind === "contactTask" ? 16 : kind === "nextTouchReminder" ? 14 : kind === "appointment" ? 12 : 8;

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

/** Task date = when to start work (not a completion deadline). */
function startWhenText(dueAt: Date | null, emptyLabel: string): string {
  if (dueAt == null) return emptyLabel;
  const dateLabel = format(dueAt, "EEE d MMM yyyy");
  if (isDueOverdue(dueAt)) return `Should have started · ${dateLabel}`;
  if (isDueToday(dueAt)) return `Start today · ${dateLabel}`;
  return `Start ${formatDistanceToNow(dueAt, { addSuffix: true })} · ${dateLabel}`;
}

function scoreContactTaskItem(
  dueAt: Date | null,
  kind: "sequenceTask" | "contactTask",
  contactUrgency: ContactUrgencyResult | undefined,
): { urgency: ContactUrgencyTier; score: number } {
  const taskScore = fallbackScoreByUrgency(dueAt, kind, "high");
  const contactBoost = (contactUrgency?.score ?? 0) / 5;
  return {
    urgency: taskScore.urgency,
    score: taskScore.score + contactBoost,
  };
}

function contactHasOpenTaskOnDay(
  contactId: string,
  day: Date,
  openContactTasks: ContactTaskRow[],
): boolean {
  return openContactTasks.some((task) => {
    if (task.contact_id !== contactId || !task.due_at) return false;
    const due = parseDateOnlyLocal(task.due_at);
    return due != null && isSameDay(due, day);
  });
}

export function buildDailyHubItems(input: {
  openContactTasks: ContactTaskRow[];
  todos: TodoRow[];
  appointments: AppointmentRow[];
  contacts: ContactRow[];
  contactNameById: Map<string, string>;
  urgencyByContactId: Map<string, ContactUrgencyResult>;
  now?: number;
}): DailyHubItem[] {
  const {
    openContactTasks,
    todos,
    appointments,
    contacts,
    contactNameById,
    urgencyByContactId,
    now = Date.now(),
  } = input;

  const nextItems: DailyHubItem[] = [];

  openContactTasks.forEach((task) => {
    const dueAt = parseDateOnlyLocal(task.due_at);
    const contactName = contactNameById.get(task.contact_id) ?? "Contact";
    const kind: DailyHubItemKind = task.sequence_enrollment_id ? "sequenceTask" : "contactTask";
    const contactUrgency = urgencyByContactId.get(task.contact_id);
    const scored = scoreContactTaskItem(dueAt, kind, contactUrgency);
    const reason =
      contactUrgency?.reasons[0] ??
      (task.sequence_enrollment_id
        ? "Sequence step ready to start."
        : dueAt && isDueOverdue(dueAt)
          ? "Start date has passed — pick this up first."
          : dueAt && isDueToday(dueAt)
            ? "Scheduled to start today."
            : "Upcoming work on your calendar.");

    nextItems.push({
      id: `contact-task-${task.id}`,
      kind,
      urgency: scored.urgency,
      score: scored.score,
      title: contactName,
      detail: task.title,
      whenText: startWhenText(dueAt, "No start date"),
      dueAt,
      contactId: task.contact_id,
      contactTaskId: task.id,
      sequenceEnrollmentId: task.sequence_enrollment_id,
      canComplete: true,
      reason,
    });
  });

  todos
    .filter((todo) => !todo.completed)
    .forEach((todo) => {
      const dueAt = parseDateOnlyLocal(todo.due_at);
      const scored = fallbackScoreByUrgency(dueAt, "todoTask", todo.priority);
      const reason =
        todo.priority === "high"
          ? "High-priority personal task."
          : dueAt && isDueOverdue(dueAt)
            ? "Start date has passed."
            : dueAt && isDueToday(dueAt)
              ? "Start today."
              : "General task on your list.";

      nextItems.push({
        id: `todo-${todo.id}`,
        kind: "todoTask",
        urgency: scored.urgency,
        score: scored.score,
        title: todo.title,
        detail: `General task (${todo.priority})`,
        whenText: startWhenText(dueAt, "No start date"),
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
      const scored = {
        urgency: base.urgency,
        score: base.score + (contactUrgency?.score ?? 0) / 12,
      };
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
        contactId: appointment.contact_id ?? undefined,
        canComplete: false,
        reason,
      });
    });

  contacts.forEach((contact) => {
    const nextTouchRaw = contact.next_touch_date?.trim();
    if (!nextTouchRaw) return;
    const dueAt = parseDateOnlyLocal(nextTouchRaw);
    if (!dueAt) return;
    if (!isDueOverdue(dueAt) && !isDueToday(dueAt)) return;
    if (contactHasOpenTaskOnDay(contact.id, dueAt, openContactTasks)) return;

    const contactName = contactNameById.get(contact.id) ?? "Contact";
    const contactUrgency = urgencyByContactId.get(contact.id);
    const scored = scoreContactTaskItem(dueAt, "contactTask", contactUrgency);

    nextItems.push({
      id: `next-touch-${contact.id}`,
      kind: "nextTouchReminder",
      urgency: scored.urgency,
      score: scored.score - 4,
      title: contactName,
      detail: "Scheduled next touch",
      whenText: startWhenText(dueAt, "Next touch"),
      dueAt,
      contactId: contact.id,
      canComplete: false,
      reason: isDueOverdue(dueAt) ? "Next touch date is overdue." : "Next touch scheduled for today.",
    });
  });

  return nextItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const at = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bt = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return at - bt;
  });
}

export function bucketDailyHubItem(item: DailyHubItem): DailyHubScheduleBucket {
  if (item.dueAt && isDueOverdue(item.dueAt)) return "overdue";
  if (item.dueAt && isDueToday(item.dueAt)) return "today";
  return "coming_up";
}

function sortComingUp(a: DailyHubItem, b: DailyHubItem): number {
  const aTs = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTs = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (aTs !== bTs) return aTs - bTs;
  return b.score - a.score;
}

export function partitionDailyHubItems(items: DailyHubItem[]): {
  overdueItems: DailyHubItem[];
  todayItems: DailyHubItem[];
  comingUpItems: DailyHubItem[];
  scheduleRows: DailyHubScheduleRow[];
} {
  const overdueItems: DailyHubItem[] = [];
  const todayItems: DailyHubItem[] = [];
  const comingUpItems: DailyHubItem[] = [];

  items.forEach((item) => {
    const bucket = bucketDailyHubItem(item);
    if (bucket === "overdue") overdueItems.push(item);
    else if (bucket === "today") todayItems.push(item);
    else comingUpItems.push(item);
  });

  overdueItems.sort(compareAttentionItemsByTierScoreDue);
  todayItems.sort(compareAttentionItemsByTierScoreDue);
  comingUpItems.sort(sortComingUp);

  const scheduleRows: DailyHubScheduleRow[] = [
    ...overdueItems.map((item) => ({ ...item, bucket: "overdue" as const })),
    ...todayItems.map((item) => ({ ...item, bucket: "today" as const })),
    ...comingUpItems.map((item) => ({ ...item, bucket: "coming_up" as const })),
  ];

  return { overdueItems, todayItems, comingUpItems, scheduleRows };
}

export function dailyHubPriorityItems(items: DailyHubItem[]): DailyHubItem[] {
  const { overdueItems, todayItems } = partitionDailyHubItems(items);
  return [...overdueItems, ...todayItems];
}

export function dailyHubKindLabel(kind: DailyHubItemKind): string {
  if (kind === "sequenceTask") return "Sequence";
  if (kind === "contactTask") return "Contact";
  if (kind === "nextTouchReminder") return "Next touch";
  if (kind === "todoTask") return "General";
  return "Appointment";
}

/** @deprecated Use dailyHubPriorityItems */
export function dailyHubStartHereItems(items: DailyHubItem[]): DailyHubItem[] {
  return dailyHubPriorityItems(items);
}

export function dailyHubBucketLabel(bucket: DailyHubScheduleBucket): string {
  if (bucket === "overdue") return "Overdue";
  if (bucket === "today") return "Today";
  return "Coming up";
}
