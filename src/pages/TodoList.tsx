import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useTodos, useAddTodo, useUpdateTodo, useDeleteTodo, type Todo } from "@/hooks/useTodos";
import { useDueSequenceActions, useUpdateContactTask } from "@/hooks/useContactTasks";
import {
  usePendingStepRunsByTaskIds,
  useCompleteNurtureStepAndAdvance,
  isNurtureNoActiveStepError,
} from "@/hooks/useNurtureSequences";
import { Plus, Trash2, Loader2, ListTodo, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { errorMessageFromUnknown } from "@/lib/utils";

function TodoRow({
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
  const dueLabel = todo.due_at ? format(new Date(todo.due_at), "d MMM yyyy") : null;
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
          {dueLabel && (
            <span className="text-[10px] text-muted-foreground">Due {dueLabel}</span>
          )}
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

export default function TodoList() {
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Todo["priority"]>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newRecurrence, setNewRecurrence] = useState<Todo["recurrence"]>("none");
  const { data: todos = [], isLoading } = useTodos();
  const { data: dueSequenceActions = [], isLoading: dueSequenceLoading } = useDueSequenceActions();
  const addTodo = useAddTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const completeAndAdvance = useCompleteNurtureStepAndAdvance();
  const updateContactTask = useUpdateContactTask();
  const { data: pendingRuns = [] } = usePendingStepRunsByTaskIds(dueSequenceActions.map((t) => t.id));
  const pendingRunByTaskId = new Map(
    pendingRuns
      .filter((r) => r.task_id)
      .map((r) => [r.task_id as string, r])
  );

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    addTodo.mutate(
      {
        title,
        priority: newPriority,
        due_at: newDueDate ? new Date(`${newDueDate}T09:00:00`).toISOString() : null,
        recurrence: newRecurrence,
      },
      {
      onSuccess: () => {
        setNewTitle("");
        setNewPriority("medium");
        setNewDueDate("");
        setNewRecurrence("none");
        toast.success("Added to list");
      },
      onError: (e) => toast.error(e.message || "Failed to add"),
      }
    );
  };

  const incomplete = useMemo(
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
  const completed = todos.filter((t) => t.completed);

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader
        title="To-Do List"
        description="Quick tasks and reminders. Add an item below and tick when done."
      />

      <Card className="zoho-card overflow-hidden border border-border max-w-2xl">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
              <ListTodo className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground">Tasks</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Add a task..."
              className="h-9 flex-1 min-w-[140px] bg-background border-border"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Todo["priority"])}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="h-9 w-[150px] bg-background border-border"
            />
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={newRecurrence}
              onChange={(e) => setNewRecurrence(e.target.value as Todo["recurrence"])}
            >
              <option value="none">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newTitle.trim() || addTodo.isPending}
              className="gap-1.5 shrink-0"
            >
              {addTodo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">Today&apos;s sequence actions</h3>
            </div>
            {dueSequenceLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sequence actions...
              </div>
            ) : dueSequenceActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No due sequence actions.</p>
            ) : (
              <ul className="space-y-2">
                {dueSequenceActions.map((task) => {
                  const run = pendingRunByTaskId.get(task.id);
                  return (
                    <li key={task.id} className="rounded-md border border-border bg-background px-3 py-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
                            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            <Link
                              to={`/contacts/${task.contact_id}`}
                              className="text-xs font-medium text-primary hover:underline truncate"
                            >
                              {task.contacts?.name?.trim() || "View contact"}
                            </Link>
                          </div>
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.due_at ? `Due ${format(new Date(task.due_at), "d MMM yyyy, h:mm a")}` : "Due now"}
                          </p>
                        </div>
                        {run && task.sequence_enrollment_id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={completeAndAdvance.isPending}
                              onClick={() =>
                                completeAndAdvance.mutate(
                                  {
                                    enrollment_id: run.enrollment_id,
                                    step_run_id: run.id,
                                    contact_id: task.contact_id,
                                    contact_task_id: task.id,
                                    outcome: "completed",
                                  },
                                  {
                                    onSuccess: () => toast.success("Step completed. Next step scheduled."),
                                    onError: (e) => {
                                      if (isNurtureNoActiveStepError(e)) {
                                        updateContactTask.mutate(
                                          {
                                            id: task.id,
                                            contact_id: task.contact_id,
                                            completed_at: new Date().toISOString(),
                                          },
                                          {
                                            onSuccess: () =>
                                              toast.success(
                                                "Task marked done. The nurture sequence had already moved on.",
                                              ),
                                            onError: (e2) => toast.error(errorMessageFromUnknown(e2)),
                                          },
                                        );
                                        return;
                                      }
                                      toast.error(errorMessageFromUnknown(e));
                                    },
                                  }
                                )
                              }
                            >
                              Complete & next
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={completeAndAdvance.isPending}
                              onClick={() =>
                                completeAndAdvance.mutate(
                                  {
                                    enrollment_id: run.enrollment_id,
                                    step_run_id: run.id,
                                    contact_id: task.contact_id,
                                    contact_task_id: task.id,
                                    outcome: "skipped",
                                  },
                                  {
                                    onSuccess: () => toast.success("Step skipped. Sequence advanced."),
                                    onError: (e) => {
                                      if (isNurtureNoActiveStepError(e)) {
                                        updateContactTask.mutate(
                                          {
                                            id: task.id,
                                            contact_id: task.contact_id,
                                            completed_at: new Date().toISOString(),
                                          },
                                          {
                                            onSuccess: () =>
                                              toast.success(
                                                "Task marked done. The nurture sequence had already moved on.",
                                              ),
                                            onError: (e2) => toast.error(errorMessageFromUnknown(e2)),
                                          },
                                        );
                                        return;
                                      }
                                      toast.error(errorMessageFromUnknown(e));
                                    },
                                  }
                                )
                              }
                            >
                              Skip
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Awaiting activation</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : todos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tasks yet. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-1">
              {incomplete.map((todo) => (
                <TodoRow
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
              {completed.length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1 px-1">
                    Done
                  </div>
                  {completed.map((todo) => (
                    <TodoRow
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
    </div>
  );
}
