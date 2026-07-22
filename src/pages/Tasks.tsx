import { useMemo, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckSquare, Users, Plus, Trash2, Loader2, FileText } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useContacts } from "@/hooks/useContacts";
import { useOpenContactTasksForUser, useUpdateContactTask, type ContactTask } from "@/hooks/useContactTasks";
import {
  usePendingStepRunsByTaskIds,
  useCompleteNurtureStepAndAdvance,
  isNurtureNoActiveStepError,
} from "@/hooks/useNurtureSequences";
import { useTodos, useAddTodo, useUpdateTodo, useDeleteTodo, type Todo } from "@/hooks/useTodos";
import { endOfWeek, format, isPast, isToday, isWithinInterval, startOfWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ContactScriptQuickSheet } from "@/components/contacts/ContactScriptQuickSheet";
import { SavedViewsMenu } from "@/components/saved-views/SavedViewsMenus";
import {
  TASKS_SAVED_VIEW_V,
  parseTasksSavedViewPayload,
  type TasksSavedViewPayloadV1,
} from "@/lib/savedViewPayloads";
import { useSavedViews } from "@/hooks/useSavedViews";
import { getTasksOpenDefaultSavedView } from "@/lib/savedViewsClientPrefs";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useDrako } from "@/components/drako";
import { pickDrakoLine } from "@/lib/drakoDialogue";
import { useDrakoProgress } from "@/hooks/useDrakoProgress";

/** Same Embla behavior as Daily Hub — smaller slide width for compact tiles. */
const TASKS_TODO_CAROUSEL_OPTS = {
  align: "start" as const,
  dragFree: true,
  containScroll: false,
};

const TASKS_TODO_SLIDE_CLASS =
  "w-[min(calc(100vw-2rem),200px)] min-w-[168px] max-w-[200px] shrink-0 basis-[min(calc(100vw-2rem),200px)] pl-2 md:pl-3";

function useTasksTodoWheelPlugins() {
  return useMemo(() => [WheelGesturesPlugin({ forceWheelAxis: "x" })], []);
}

function todoPriorityClass(todo: Todo) {
  return todo.priority === "high"
    ? "bg-destructive/15 text-destructive border-destructive/25"
    : todo.priority === "low"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/25"
      : "bg-amber-500/15 text-amber-700 border-amber-500/25";
}

/** Compact tile for horizontal carousel (smaller than Daily Hub focus cards). */
function PersonalTodoCarouselCard({
  todo,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
  isDeleting: boolean;
}) {
  const dueLabel = todo.due_at ? format(new Date(todo.due_at), "d MMM") : null;
  const priorityClass = todoPriorityClass(todo);
  return (
    <Card
      className={cn(
        "group h-full flex flex-col gap-1 border border-border bg-background/90 p-2 shadow-sm transition-colors hover:border-border hover:bg-muted/30",
        todo.completed && "opacity-75",
      )}
    >
      <div className="flex items-start gap-1.5">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={onToggle}
          disabled={isToggling}
          className="mt-0.5 shrink-0"
          aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        />
        {isToggling ? (
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "line-clamp-3 text-[13px] font-medium leading-snug",
              todo.completed && "text-muted-foreground line-through",
            )}
          >
            {todo.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span
              className={cn(
                "inline-flex rounded-full border px-1 py-0.5 text-[9px] font-semibold uppercase leading-none",
                priorityClass,
              )}
            >
              {todo.priority}
            </span>
            {dueLabel ? (
              <span className="text-[10px] text-muted-foreground">Due {dueLabel}</span>
            ) : null}
            {todo.recurrence !== "none" ? (
              <span className="text-[10px] text-muted-foreground capitalize">{todo.recurrence}</span>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-70 hover:text-destructive group-hover:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          disabled={isDeleting}
          aria-label="Delete"
        >
          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </Card>
  );
}

function PersonalTodoCarouselStrip({
  title,
  todos,
  emptyText,
  renderCard,
}: {
  title: string;
  todos: Todo[];
  emptyText: string;
  renderCard: (todo: Todo) => ReactNode;
}) {
  const plugins = useTasksTodoWheelPlugins();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
        <Badge variant="outline" className="border-border/70 text-[10px]">
          {todos.length}
        </Badge>
      </div>
      {todos.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="touch-pan-x w-full min-w-0">
          <Carousel opts={TASKS_TODO_CAROUSEL_OPTS} plugins={plugins} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-3">
              {todos.map((todo) => (
                <CarouselItem key={todo.id} className={TASKS_TODO_SLIDE_CLASS}>
                  {renderCard(todo)}
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      )}
    </div>
  );
}

/** Compact tile for a contact-linked task, styled to match personal to-do tiles. */
function ContactTaskCarouselCard({
  task,
  contactName,
  onToggle,
  onOpen,
  isToggling,
}: {
  task: ContactTask;
  contactName: string;
  onToggle: () => void;
  onOpen: () => void;
  isToggling: boolean;
}) {
  const dueLabel = task.due_at ? format(new Date(task.due_at), "d MMM") : null;
  const isSequence = Boolean(task.sequence_enrollment_id);
  return (
    <Card className="group h-full flex flex-col gap-1 border border-border bg-background/90 p-2 shadow-sm transition-colors hover:border-border hover:bg-muted/30">
      <div className="flex items-start gap-1.5">
        <Checkbox
          checked={false}
          onCheckedChange={(v) => {
            if (v === true) onToggle();
          }}
          disabled={isToggling}
          className="mt-0.5 shrink-0"
          aria-label="Mark complete"
        />
        {isToggling ? (
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="line-clamp-3 text-[13px] font-medium leading-snug">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-primary/25 bg-primary/15 px-1 py-0.5 text-[9px] font-semibold uppercase leading-none text-primary">
              <Users className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{contactName}</span>
            </span>
            {isSequence ? (
              <span className="text-[9px] font-semibold uppercase leading-none text-primary/80">Sequence</span>
            ) : null}
            {dueLabel ? <span className="text-[10px] text-muted-foreground">Due {dueLabel}</span> : null}
          </div>
        </button>
      </div>
    </Card>
  );
}

/** Generic carousel strip that renders arbitrary tiles (personal + contact tasks together). */
function TodoCarouselStrip({
  title,
  count,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  children: ReactNode;
}) {
  const plugins = useTasksTodoWheelPlugins();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
        <Badge variant="outline" className="border-border/70 text-[10px]">
          {count}
        </Badge>
      </div>
      {count === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="touch-pan-x w-full min-w-0">
          <Carousel opts={TASKS_TODO_CAROUSEL_OPTS} plugins={plugins} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-3">{children}</CarouselContent>
          </Carousel>
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const navigate = useNavigate();
  const { setMood } = useDrako();
  const { grantXp } = useDrakoProgress();
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: contacts = [] } = useContacts();
  const { data: contactTasks = [], isLoading: ctLoading } = useOpenContactTasksForUser();
  const { data: todos = [], isLoading: todosLoading } = useTodos();
  const addTodo = useAddTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const updateContactTask = useUpdateContactTask();
  const completeStep = useCompleteNurtureStepAndAdvance();
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "overdue" | "this_week">("all");
  const [mainTab, setMainTab] = useState<"appointments" | "todos">("appointments");
  const sequenceTaskIds = useMemo(
    () => contactTasks.filter((t) => t.sequence_enrollment_id).map((t) => t.id),
    [contactTasks]
  );
  const { data: pendingRuns = [] } = usePendingStepRunsByTaskIds(sequenceTaskIds);
  const pendingRunByTaskId = useMemo(() => {
    const map = new Map<string, (typeof pendingRuns)[number]>();
    pendingRuns.forEach((r) => {
      if (r.task_id) map.set(r.task_id, r);
    });
    return map;
  }, [pendingRuns]);
  const [newPersonalTitle, setNewPersonalTitle] = useState("");
  const [newPersonalPriority, setNewPersonalPriority] = useState<Todo["priority"]>("medium");
  const [newPersonalDueDate, setNewPersonalDueDate] = useState("");
  const [newPersonalRecurrence, setNewPersonalRecurrence] = useState<Todo["recurrence"]>("none");

  const contactNameById = useMemo(() => new Map(contacts.map((c) => [c.id, c.name ?? "Contact"])), [contacts]);
  const contactCategoryById = useMemo(
    () =>
      new Map(
        contacts.map((c) => [c.id, (c as { contact_category?: string | null }).contact_category ?? null]),
      ),
    [contacts],
  );

  const [scriptTaskContactId, setScriptTaskContactId] = useState<string | null>(null);

  const sortedContactTasks = useMemo(() => {
    const name = (id: string) => contactNameById.get(id) ?? "Contact";
    return [...contactTasks].sort((a, b) => {
      const byName = name(a.contact_id).localeCompare(name(b.contact_id), undefined, { sensitivity: "base" });
      if (byName !== 0) return byName;
      const da = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const db = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return da - db;
    });
  }, [contactTasks, contactNameById]);

  const incompletePersonal = useMemo(
    () =>
      todos
        .filter((t) => !t.completed)
        .sort((a, b) => {
          const priorityRank = { high: 0, medium: 1, low: 2 } as const;
          const pa = priorityRank[a.priority];
          const pb = priorityRank[b.priority];
          if (pa !== pb) return pa - pb;
          const da = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
          const db = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
          return da - db;
        }),
    [todos]
  );
  const completedPersonal = useMemo(() => todos.filter((t) => t.completed), [todos]);

  /** Open contact tasks sorted by due date, for the merged To-do carousel. */
  const openContactTasksByDue = useMemo(
    () =>
      [...contactTasks].sort((a, b) => {
        const da = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      }),
    [contactTasks],
  );

  /** Complete a contact task, routing nurture-sequence steps through the sequence engine. */
  const handleCompleteContactTask = useCallback(
    (t: ContactTask) => {
      const run = pendingRunByTaskId.get(t.id);
      if (t.sequence_enrollment_id && run) {
        completeStep.mutate(
          {
            enrollment_id: run.enrollment_id,
            step_run_id: run.id,
            contact_id: t.contact_id,
            contact_task_id: t.id,
            outcome: "completed",
          },
          {
            onSuccess: () => {
              toast.success("Step completed. Next step scheduled.");
              setMood("wave", { caption: pickDrakoLine("nurtureStep") });
              grantXp("nurtureStep");
            },
            onError: (e) => {
              if (isNurtureNoActiveStepError(e)) {
                updateContactTask.mutate(
                  { id: t.id, contact_id: t.contact_id, completed_at: new Date().toISOString() },
                  {
                    onSuccess: () =>
                      toast.success("Task marked done. The nurture sequence had already moved on."),
                    onError: (e2) => toast.error(e2 instanceof Error ? e2.message : "Failed"),
                  },
                );
                return;
              }
              toast.error(e instanceof Error ? e.message : "Failed");
            },
          },
        );
        return;
      }
      updateContactTask.mutate(
        { id: t.id, contact_id: t.contact_id, completed_at: new Date().toISOString() },
        {
          onSuccess: () => {
            toast.success("Done");
            setMood("celebrate", { caption: pickDrakoLine("taskDone") });
            grantXp("taskDone");
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
        },
      );
    },
    [pendingRunByTaskId, completeStep, updateContactTask, setMood, grantXp],
  );

  const tasks = useMemo(() => {
    const sorted = [...appointments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (filter === "today") {
      return sorted.filter((a) => isToday(new Date(a.date)));
    }
    if (filter === "upcoming") {
      return sorted.filter((a) => !isPast(new Date(a.date)));
    }
    if (filter === "overdue") {
      return sorted.filter((a) => {
        const d = new Date(a.date);
        return isPast(d) && !isToday(d);
      });
    }
    if (filter === "this_week") {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const end = endOfWeek(new Date(), { weekStartsOn: 1 });
      return sorted.filter((a) => isWithinInterval(new Date(a.date), { start, end }));
    }
    return sorted;
  }, [appointments, filter]);

  const overdueCount = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.date);
        return isPast(d) && !isToday(d);
      }).length,
    [appointments]
  );

  const buildTasksSavedViewPayload = useCallback((): TasksSavedViewPayloadV1 => {
    return {
      v: TASKS_SAVED_VIEW_V,
      mainTab,
      appointmentsFilter: filter,
    };
  }, [mainTab, filter]);

  const applyTasksSavedViewPayload = useCallback((p: TasksSavedViewPayloadV1) => {
    setMainTab(p.mainTab);
    setFilter(p.appointmentsFilter);
  }, []);

  const { data: tasksSavedViews = [], isSuccess: tasksViewsReady } = useSavedViews("tasks");
  const defaultTasksViewAppliedRef = useRef(false);

  useEffect(() => {
    if (!tasksViewsReady || defaultTasksViewAppliedRef.current) return;
    if (!getTasksOpenDefaultSavedView()) return;
    const row = tasksSavedViews.find((v) => v.is_default);
    if (!row) return;
    const p = parseTasksSavedViewPayload(row.filters);
    if (!p) return;
    defaultTasksViewAppliedRef.current = true;
    applyTasksSavedViewPayload(p);
  }, [tasksViewsReady, tasksSavedViews, applyTasksSavedViewPayload]);

  const handleAddPersonal = () => {
    const title = newPersonalTitle.trim();
    if (!title) return;
    addTodo.mutate(
      {
        title,
        priority: newPersonalPriority,
        due_at: newPersonalDueDate ? new Date(`${newPersonalDueDate}T09:00:00`).toISOString() : null,
        recurrence: newPersonalRecurrence,
      },
      {
      onSuccess: () => {
        setNewPersonalTitle("");
        setNewPersonalPriority("medium");
        setNewPersonalDueDate("");
        setNewPersonalRecurrence("none");
        toast.success("Added");
      },
      onError: (e) => toast.error(e.message || "Failed to add"),
      }
    );
  };

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader
        title="Tasks"
        actions={
          <SavedViewsMenu
            objectType="tasks"
            buildPayload={buildTasksSavedViewPayload}
            applyPayload={applyTasksSavedViewPayload}
          />
        }
      />
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="zoho-card border border-border p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Appointments</div>
          <div className="mt-0.5 text-xl font-semibold">{appointments.length}</div>
        </Card>
        <Card className="zoho-card border border-border p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Overdue</div>
          <div className="mt-0.5 text-xl font-semibold text-amber-500">{overdueCount}</div>
        </Card>
        <Card className="zoho-card border border-border p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Open to-dos</div>
          <div className="mt-0.5 text-xl font-semibold">{incompletePersonal.length + contactTasks.length}</div>
        </Card>
      </div>

      <div className="mt-4 min-w-0 rounded-lg border border-border/70 bg-card/45 p-2.5 md:p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <CheckSquare className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">General tasks</h2>
              <p className="text-[11px] text-muted-foreground">
                Drag or scroll sideways — same carousel as Daily Hub, smaller tiles.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Add a task…"
            className="h-9 border-border bg-background"
            value={newPersonalTitle}
            onChange={(e) => setNewPersonalTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPersonal()}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              value={newPersonalPriority}
              onChange={(e) => setNewPersonalPriority(e.target.value as Todo["priority"])}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Input
              type="date"
              value={newPersonalDueDate}
              onChange={(e) => setNewPersonalDueDate(e.target.value)}
              className="h-9 border-border bg-background text-xs"
            />
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              value={newPersonalRecurrence}
              onChange={(e) => setNewPersonalRecurrence(e.target.value as Todo["recurrence"])}
            >
              <option value="none">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <Button
              size="sm"
              onClick={handleAddPersonal}
              disabled={!newPersonalTitle.trim() || addTodo.isPending}
              className="h-9 gap-1.5"
            >
              {addTodo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </div>

        {todosLoading || ctLoading ? (
          <div className="mt-3 flex gap-2 overflow-hidden pt-1">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[92px] w-[200px] shrink-0 rounded-lg" />
            ))}
          </div>
        ) : todos.length === 0 && contactTasks.length === 0 ? (
          <p className="mt-3 border-t border-border/50 px-1 py-4 text-center text-xs text-muted-foreground">
            No tasks yet. Add one above, or set a follow-up on a contact.
          </p>
        ) : (
          <div className="mt-3 space-y-4 border-t border-border/50 pt-3">
            <TodoCarouselStrip
              title="To do"
              count={incompletePersonal.length + openContactTasksByDue.length}
              emptyText="Nothing open."
            >
              {incompletePersonal.map((todo) => (
                <CarouselItem key={`todo-${todo.id}`} className={TASKS_TODO_SLIDE_CLASS}>
                  <PersonalTodoCarouselCard
                    todo={todo}
                    onToggle={() => {
                      const markingComplete = !todo.completed;
                      updateTodo.mutate(
                        { id: todo.id, completed: markingComplete },
                        {
                          onSuccess: () => {
                            if (markingComplete) {
                              setMood("celebrate", { caption: pickDrakoLine("taskDone") });
                              grantXp("taskDone");
                            }
                          },
                          onError: (e) => toast.error(e.message || "Failed to update"),
                        },
                      );
                    }}
                    onDelete={() =>
                      deleteTodo.mutate(todo.id, {
                        onSuccess: () => toast.success("Removed"),
                        onError: (e) => toast.error(e.message || "Failed to delete"),
                      })
                    }
                    isToggling={updateTodo.isPending && updateTodo.variables?.id === todo.id}
                    isDeleting={deleteTodo.isPending && deleteTodo.variables === todo.id}
                  />
                </CarouselItem>
              ))}
              {openContactTasksByDue.map((t) => (
                <CarouselItem key={`ct-${t.id}`} className={TASKS_TODO_SLIDE_CLASS}>
                  <ContactTaskCarouselCard
                    task={t}
                    contactName={contactNameById.get(t.contact_id) ?? "Contact"}
                    onToggle={() => handleCompleteContactTask(t)}
                    onOpen={() =>
                      navigate(
                        t.sequence_enrollment_id
                          ? `/contacts/${t.contact_id}?nurtureFocus=1`
                          : `/contacts/${t.contact_id}`,
                      )
                    }
                    isToggling={
                      (updateContactTask.isPending && updateContactTask.variables?.id === t.id) ||
                      (completeStep.isPending && completeStep.variables?.contact_task_id === t.id)
                    }
                  />
                </CarouselItem>
              ))}
            </TodoCarouselStrip>
            {completedPersonal.length > 0 ? (
              <PersonalTodoCarouselStrip
                title="Done"
                todos={completedPersonal}
                emptyText="No completed items."
                renderCard={(todo) => (
                  <PersonalTodoCarouselCard
                    todo={todo}
                    onToggle={() =>
                      updateTodo.mutate(
                        { id: todo.id, completed: false },
                        { onError: (e) => toast.error(e.message || "Failed to update") },
                      )
                    }
                    onDelete={() =>
                      deleteTodo.mutate(todo.id, {
                        onSuccess: () => toast.success("Removed"),
                        onError: (e) => toast.error(e.message || "Failed to delete"),
                      })
                    }
                    isToggling={updateTodo.isPending && updateTodo.variables?.id === todo.id}
                    isDeleting={deleteTodo.isPending && deleteTodo.variables === todo.id}
                  />
                )}
              />
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-4">
        <Card className="zoho-card border border-border p-3 md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Appointments</h2>
            </div>
            <Badge variant="outline" className="text-xs">
              {tasks.length} shown
            </Badge>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
              All
            </Button>
            <Button variant={filter === "today" ? "default" : "outline"} size="sm" onClick={() => setFilter("today")}>
              Today
            </Button>
            <Button
              variant={filter === "upcoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("upcoming")}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === "overdue" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("overdue")}
            >
              Overdue
            </Button>
            <Button
              variant={filter === "this_week" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("this_week")}
            >
              This week
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-1.5">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">
                {filter !== "all" ? `No ${filter} appointments.` : "No appointments yet. Schedule from Calendar or Dashboard."}
              </p>
              <Button variant="default" onClick={() => navigate("/calendar")}>
                <Calendar className="w-4 h-4 mr-2" />
                Open Calendar
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {tasks.map((apt) => {
                const date = new Date(apt.date);
                const isOverdue = isPast(date) && !isToday(date);
                return (
                  <Card
                    key={apt.id}
                    className={`p-2.5 border border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer ${isOverdue ? "border-amber-500/30" : ""}`}
                    onClick={() => navigate("/appointments")}
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={isPast(date)}
                        onCheckedChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{apt.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(date, "EEE, d MMM · HH:mm")}
                          {apt.location && ` · ${apt.location}`}
                        </p>
                      </div>
                      {isOverdue && <span className="text-xs text-amber-500">Overdue</span>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="zoho-card overflow-hidden border border-border mt-4">
        <div className="p-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-sm">Contact follow-ups</h2>
                <p className="text-xs text-muted-foreground">
                  Follow-ups and nurture steps. Open a contact or complete inline.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {contactTasks.length} open
            </Badge>
          </div>
        </div>
        <div className="p-2.5">
              {ctLoading ? (
                <div className="space-y-1.5">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : contactTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No open tasks on contacts.</p>
              ) : (
                <div className="space-y-2">
                  {sortedContactTasks.map((t) => {
                    const due = t.due_at ? new Date(t.due_at) : null;
                    const overdue = due ? isPast(due) && !isToday(due) : false;
                    return (
                      <Card
                        key={t.id}
                        className={`p-2.5 border border-border zoho-card ${overdue ? "border-amber-500/30" : ""}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <Checkbox
                            checked={false}
                            onCheckedChange={(v) => {
                              if (v !== true) return;
                              const run = pendingRunByTaskId.get(t.id);
                              if (t.sequence_enrollment_id && run) {
                                completeStep.mutate(
                                  {
                                    enrollment_id: run.enrollment_id,
                                    step_run_id: run.id,
                                    contact_id: t.contact_id,
                                    contact_task_id: t.id,
                                    outcome: "completed",
                                  },
                                  {
                                    onSuccess: () => {
                                      toast.success("Step completed. Next step scheduled.");
                                      setMood("wave", { caption: pickDrakoLine("nurtureStep") });
                                      grantXp("nurtureStep");
                                    },
                                    onError: (e) => {
                                      if (isNurtureNoActiveStepError(e)) {
                                        updateContactTask.mutate(
                                          {
                                            id: t.id,
                                            contact_id: t.contact_id,
                                            completed_at: new Date().toISOString(),
                                          },
                                          {
                                            onSuccess: () =>
                                              toast.success(
                                                "Task marked done. The nurture sequence had already moved on.",
                                              ),
                                            onError: (e2) =>
                                              toast.error(e2 instanceof Error ? e2.message : "Failed"),
                                          },
                                        );
                                        return;
                                      }
                                      toast.error(e instanceof Error ? e.message : "Failed");
                                    },
                                  }
                                );
                                return;
                              }
                              updateContactTask.mutate(
                                {
                                  id: t.id,
                                  contact_id: t.contact_id,
                                  completed_at: new Date().toISOString(),
                                },
                                {
                                  onSuccess: () => toast.success("Done"),
                                  onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
                                }
                              );
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              className="text-left w-full"
                              onClick={() =>
                                navigate(
                                  t.sequence_enrollment_id
                                    ? `/contacts/${t.contact_id}?nurtureFocus=1`
                                    : `/contacts/${t.contact_id}`
                                )
                              }
                            >
                              <p className="text-sm font-medium text-foreground truncate">
                                {contactNameById.get(t.contact_id) ?? "Contact"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t.sequence_enrollment_id ? (
                                  <span className="font-medium text-primary/90">Sequence task · </span>
                                ) : null}
                                <span>{t.title}</span>
                                {due && ` · ${format(due, "d MMM yyyy")}`}
                              </p>
                            </button>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Scripts for this contact"
                              aria-label="Open scripts for contact"
                              onClick={(e) => {
                                e.stopPropagation();
                                setScriptTaskContactId(t.contact_id);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {t.sequence_enrollment_id && pendingRunByTaskId.get(t.id) ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="shrink-0"
                                onClick={() => {
                                  const run = pendingRunByTaskId.get(t.id);
                                  if (!run || !t.sequence_enrollment_id) return;
                                  completeStep.mutate(
                                    {
                                      enrollment_id: run.enrollment_id,
                                      step_run_id: run.id,
                                      contact_id: t.contact_id,
                                      contact_task_id: t.id,
                                      outcome: "completed",
                                    },
                                    {
                                      onSuccess: () => {
                                        toast.success("Step completed. Next step scheduled.");
                                        setMood("wave", { caption: pickDrakoLine("nurtureStep") });
                                      },
                                      onError: (e) => {
                                        if (isNurtureNoActiveStepError(e)) {
                                          updateContactTask.mutate(
                                            {
                                              id: t.id,
                                              contact_id: t.contact_id,
                                              completed_at: new Date().toISOString(),
                                            },
                                            {
                                              onSuccess: () =>
                                                toast.success(
                                                  "Task marked done. The nurture sequence had already moved on.",
                                                ),
                                              onError: (e2) =>
                                                toast.error(e2 instanceof Error ? e2.message : "Failed"),
                                            },
                                          );
                                          return;
                                        }
                                        toast.error(e instanceof Error ? e.message : "Failed");
                                      },
                                    }
                                  );
                                }}
                              >
                                Complete & next
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
        </div>
      </Card>

      <ContactScriptQuickSheet
        key={scriptTaskContactId ?? "closed"}
        open={scriptTaskContactId != null}
        onOpenChange={(open) => {
          if (!open) setScriptTaskContactId(null);
        }}
        contactCategory={scriptTaskContactId ? contactCategoryById.get(scriptTaskContactId) ?? null : null}
      />
    </div>
  );
}
