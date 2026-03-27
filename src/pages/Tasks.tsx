import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ListTodo, CheckSquare, Users, Plus, Trash2, Loader2 } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useContacts } from "@/hooks/useContacts";
import { useOpenContactTasksForUser, useUpdateContactTask } from "@/hooks/useContactTasks";
import { usePendingStepRunsByTaskIds, useCompleteNurtureStepAndAdvance } from "@/hooks/useNurtureSequences";
import { useTodos, useAddTodo, useUpdateTodo, useDeleteTodo, type Todo } from "@/hooks/useTodos";
import { format, isPast, isToday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function PersonalTodoRow({
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
  const priorityClass =
    todo.priority === "high"
      ? "bg-destructive/15 text-destructive border-destructive/25"
      : todo.priority === "low"
        ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/25"
        : "bg-amber-500/15 text-amber-700 border-amber-500/25";
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2.5 px-3 rounded-lg border border-transparent hover:bg-muted/40 hover:border-border transition-colors group",
        todo.completed && "opacity-70"
      )}
    >
      <Checkbox
        checked={todo.completed}
        onCheckedChange={onToggle}
        disabled={isToggling}
        className="shrink-0"
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
      />
      {isToggling ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
      ) : null}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "block text-sm",
            todo.completed && "line-through text-muted-foreground"
          )}
        >
          {todo.title}
        </span>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={cn("inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase", priorityClass)}>
            {todo.priority}
          </span>
          {dueLabel && <span className="text-[10px] text-muted-foreground">Due {dueLabel}</span>}
          {todo.recurrence !== "none" && (
            <span className="text-[10px] text-muted-foreground capitalize">Repeats {todo.recurrence}</span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.preventDefault();
          onDelete();
        }}
        disabled={isDeleting}
        aria-label="Delete"
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function Tasks() {
  const navigate = useNavigate();
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: contacts = [] } = useContacts();
  const { data: contactTasks = [], isLoading: ctLoading } = useOpenContactTasksForUser();
  const { data: todos = [], isLoading: todosLoading } = useTodos();
  const addTodo = useAddTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const updateContactTask = useUpdateContactTask();
  const completeStep = useCompleteNurtureStepAndAdvance();
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");
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

  const todoTabBadge =
    incompletePersonal.length + contactTasks.length > 0
      ? incompletePersonal.length + contactTasks.length
      : 0;

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
        description="Appointments, your general to-dos, and open tasks on contacts."
      />
      <Tabs defaultValue="appointments" className="mt-4">
        <TabsList className="mb-4 flex-wrap h-auto gap-1 py-1">
          <TabsTrigger value="appointments" className="gap-1.5">
            <Calendar className="w-4 h-4" /> Appointments
          </TabsTrigger>
          <TabsTrigger value="todos" className="gap-1.5">
            <ListTodo className="w-4 h-4" /> To-do list
            {todoTabBadge > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-xs">{todoTabBadge}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={filter === "today" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("today")}
                >
                  Today
                </Button>
                <Button
                  variant={filter === "upcoming" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("upcoming")}
                >
                  Upcoming
                </Button>
                {overdueCount > 0 && (
                  <span className="text-sm text-muted-foreground self-center">{overdueCount} overdue</span>
                )}
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">
                    {filter !== "all"
                      ? `No ${filter} appointments.`
                      : "No appointments yet. Schedule from Calendar or Dashboard."}
                  </p>
                  <Button variant="default" onClick={() => navigate("/calendar")}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Open Calendar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((apt) => {
                    const date = new Date(apt.date);
                    const isOverdue = isPast(date) && !isToday(date);
                    return (
                      <Card
                        key={apt.id}
                        className={`p-3 border border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer zoho-card ${isOverdue ? "border-amber-500/30" : ""}`}
                        onClick={() => navigate("/appointments")}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isPast(date)}
                            onCheckedChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                            className="pointer-events-none"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{apt.title}</p>
                            <p className="text-sm text-muted-foreground">
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
            </>
          )}
        </TabsContent>

        <TabsContent value="todos" className="space-y-6">
          {/* General tasks (personal todos) */}
          <Card className="zoho-card overflow-hidden border border-border">
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                  <CheckSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">General tasks</h2>
                  <p className="text-xs text-muted-foreground">
                    Your own reminders — not linked to a contact.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a task…"
                  className="bg-background border-border flex-1"
                  value={newPersonalTitle}
                  onChange={(e) => setNewPersonalTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPersonal()}
                />
                <select
                  className="h-10 rounded-md border border-border bg-background px-2 text-sm"
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
                  className="bg-background border-border w-[140px]"
                />
                <select
                  className="h-10 rounded-md border border-border bg-background px-2 text-sm"
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
                  className="gap-1.5 shrink-0"
                >
                  {addTodo.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </Button>
              </div>
            </div>
            <div className="p-3">
              {todosLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : todos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No general tasks yet. Add one above.
                </p>
              ) : (
                <div className="space-y-1">
                  {incompletePersonal.map((todo) => (
                    <PersonalTodoRow
                      key={todo.id}
                      todo={todo}
                      onToggle={() =>
                        updateTodo.mutate(
                          { id: todo.id, completed: !todo.completed },
                          { onError: (e) => toast.error(e.message || "Failed to update") }
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
                  ))}
                  {completedPersonal.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1 px-1">
                        Done
                      </div>
                      {completedPersonal.map((todo) => (
                        <PersonalTodoRow
                          key={todo.id}
                          todo={todo}
                          onToggle={() =>
                            updateTodo.mutate(
                              { id: todo.id, completed: false },
                              { onError: (e) => toast.error(e.message || "Failed to update") }
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
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Contact CRM tasks */}
          <Card className="zoho-card overflow-hidden border border-border">
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">Contacts with tasks</h2>
                  <p className="text-xs text-muted-foreground">
                    Follow-ups and nurture steps — tap a row to open the contact.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3">
              {ctLoading ? (
                <div className="space-y-2">
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
                        className={`p-3 border border-border zoho-card ${overdue ? "border-amber-500/30" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={false}
                            onCheckedChange={(v) => {
                              if (v !== true) return;
                              const run = pendingRunByTaskId.get(t.id);
                              if (t.sequence_enrollment_id && run) {
                                completeStep.mutate(
                                  {
                                    enrollment_id: t.sequence_enrollment_id,
                                    step_run_id: run.id,
                                    contact_id: t.contact_id,
                                    outcome: "completed",
                                  },
                                  {
                                    onSuccess: () => toast.success("Step completed. Next step scheduled."),
                                    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
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
                              <p className="font-medium text-foreground truncate">
                                {contactNameById.get(t.contact_id) ?? "Contact"}
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {t.sequence_enrollment_id ? (
                                  <span className="font-medium text-primary/90">Sequence task · </span>
                                ) : null}
                                <span>{t.title}</span>
                                {due && ` · ${format(due, "d MMM yyyy")}`}
                              </p>
                            </button>
                          </div>
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
                                    enrollment_id: t.sequence_enrollment_id,
                                    step_run_id: run.id,
                                    contact_id: t.contact_id,
                                    outcome: "completed",
                                  },
                                  {
                                    onSuccess: () => toast.success("Step completed. Next step scheduled."),
                                    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
                                  }
                                );
                              }}
                            >
                              Complete & next
                            </Button>
                          ) : null}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
