import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronDown, Loader2, Sparkles } from "lucide-react";
import {
  buildDailyHubItems,
  partitionDailyHubItems,
  type DailyHubItem,
} from "@/lib/dailyHubSchedule";
import {
  clearAssignment,
  loadDailyHubTriage,
  saveDailyHubTriage,
  type DailyHubTriageZone,
} from "@/lib/dailyHubTriage";
import { isoFromDateInput, todayDateInputValue } from "@/lib/localDateParse";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { useContactUrgency } from "@/hooks/useContactUrgency";
import {
  useOpenContactTasksForUser,
  useCreateContactTask,
  useUpdateContactTask,
} from "@/hooks/useContactTasks";
import { useTodos, useAddTodo, useUpdateTodo } from "@/hooks/useTodos";
import { hrefForWorkNow, hrefForWorkWorkspace } from "@/lib/attentionWorkWorkspace";
import { DailyHubKanbanBoard } from "@/components/dashboard/DailyHubKanbanBoard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type AttentionItem = DailyHubItem;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybe = (error as { message?: unknown }).message;
    if (typeof maybe === "string" && maybe.trim()) return maybe;
  }
  return "Could not complete this item.";
}

function workWorkspaceHref(item: AttentionItem): string | null {
  if (item.kind === "appointment" && item.appointmentId) {
    return hrefForWorkWorkspace({
      kind: "appointment",
      appointmentId: item.appointmentId,
      contactId: item.contactId,
    });
  }
  if (item.kind === "sequenceTask" && item.contactTaskId && item.contactId) {
    return hrefForWorkWorkspace({
      kind: "sequenceTask",
      contactTaskId: item.contactTaskId,
      contactId: item.contactId,
    });
  }
  if (item.kind === "contactTask" && item.contactTaskId && item.contactId) {
    return hrefForWorkWorkspace({
      kind: "contactTask",
      contactTaskId: item.contactTaskId,
      contactId: item.contactId,
    });
  }
  if (item.kind === "todoTask" && item.todoId) {
    return hrefForWorkWorkspace({ kind: "todoTask", todoId: item.todoId });
  }
  return null;
}

export function AttentionHubWidget() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();
  const { data: openContactTasks = [] } = useOpenContactTasksForUser();
  const { data: todos = [] } = useTodos();
  const { urgencyByContactId } = useContactUrgency();

  const addTodo = useAddTodo();
  const createContactTask = useCreateContactTask();
  const updateContactTask = useUpdateContactTask();
  const updateTodo = useUpdateTodo();

  const [addType, setAddType] = useState<"todo" | "contact">("todo");
  const [newTitle, setNewTitle] = useState("");
  const [newDueAt, setNewDueAt] = useState(() => todayDateInputValue());
  const [newContactId, setNewContactId] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);

  const contactNameById = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((contact) => {
      map.set(contact.id, getContactDisplayName(contact));
    });
    return map;
  }, [contacts]);

  const items = useMemo(
    () =>
      buildDailyHubItems({
        openContactTasks,
        todos,
        appointments,
        contacts,
        contactNameById,
        urgencyByContactId,
      }),
    [appointments, contactNameById, contacts, openContactTasks, todos, urgencyByContactId],
  );

  const scheduleRows = useMemo(() => partitionDailyHubItems(items).scheduleRows, [items]);

  const handleOpenItem = useCallback(
    (item: AttentionItem) => {
      if (item.kind === "appointment") {
        navigate(
          hrefForWorkNow({
            kind: "appointment",
            appointmentId: item.appointmentId,
            contactId: item.contactId,
          }),
        );
        return;
      }
      if (item.contactId) {
        navigate(
          item.kind === "sequenceTask"
            ? `/contacts/${item.contactId}?nurtureFocus=1${item.contactTaskId ? `&contactTaskId=${item.contactTaskId}&work=1` : ""}`
            : item.kind === "nextTouchReminder"
              ? `/contacts/${item.contactId}`
              : `/contacts/${item.contactId}${item.contactTaskId ? `?contactTaskId=${item.contactTaskId}&work=1` : ""}`,
        );
        return;
      }
      if (item.todoId) {
        navigate(hrefForWorkNow({ kind: "todoTask", todoId: item.todoId }));
        return;
      }
      navigate("/tasks");
    },
    [navigate],
  );

  const handleOpenForZone = useCallback(
    (item: AttentionItem, zone: DailyHubTriageZone) => {
      if (zone === "focus") {
        const workHref = workWorkspaceHref(item);
        if (workHref) {
          navigate(workHref);
          return;
        }
      }
      handleOpenItem(item);
    },
    [handleOpenItem, navigate],
  );

  const handleCompleteItem = useCallback(
    async (item: AttentionItem) => {
      setCompletingId(item.id);
      try {
        if (item.todoId) {
          await updateTodo.mutateAsync({ id: item.todoId, completed: true });
        } else if (item.contactTaskId && item.contactId) {
          await updateContactTask.mutateAsync({
            id: item.contactTaskId,
            contact_id: item.contactId,
            completed_at: new Date().toISOString(),
          });
        } else {
          toast({ title: "Could not complete", description: "This item cannot be marked done from here.", variant: "destructive" });
          return;
        }
        const triage = loadDailyHubTriage(user?.id);
        const nextAssignments = clearAssignment(triage.assignments, item.id);
        saveDailyHubTriage(user?.id, { v: 1, assignments: nextAssignments });
        toast({ title: "Done", description: "Task marked complete." });
      } catch (error) {
        toast({ title: "Could not complete", description: getErrorMessage(error), variant: "destructive" });
      } finally {
        setCompletingId(null);
      }
    },
    [toast, updateContactTask, updateTodo, user?.id],
  );

  const handleAdd = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) {
      toast({ title: "Title required", description: "Please enter a title.", variant: "destructive" });
      return;
    }
    const startDate = newDueAt.trim() ? isoFromDateInput(newDueAt.slice(0, 10)) : isoFromDateInput(todayDateInputValue());
    try {
      if (addType === "todo") {
        await addTodo.mutateAsync({ title, due_at: startDate });
      } else {
        if (!newContactId) {
          toast({ title: "Contact required", description: "Select a contact for this task.", variant: "destructive" });
          return;
        }
        await createContactTask.mutateAsync({
          contact_id: newContactId,
          title,
          due_at: startDate,
        });
      }
      setNewTitle("");
      setNewDueAt(todayDateInputValue());
      setNewContactId("");
      toast({ title: "Added", description: "Task added to your queue." });
    } catch (error) {
      toast({ title: "Add failed", description: getErrorMessage(error) });
    }
  }, [addTodo, addType, createContactTask, newContactId, newDueAt, newTitle, toast]);

  const addTaskForm = (
    <Collapsible className="group mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
          Add task
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2 rounded-lg border border-border/70 bg-card/45 p-2.5">
        <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)_140px_170px_auto]">
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
            type="date"
            value={newDueAt}
            onChange={(e) => setNewDueAt(e.target.value)}
            className="h-9 text-xs"
            title="Start date"
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
  );

  if (items.length === 0) {
    return (
      <Card className="zoho-card border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          Daily brief
        </p>
        <p className="mt-1 text-xs text-muted-foreground">No tasks or appointments on your radar.</p>
        <Collapsible className="mt-3">
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Add a task
            <ChevronDown className="h-3.5 w-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto_auto]">
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
                type="date"
                value={newDueAt}
                onChange={(e) => setNewDueAt(e.target.value)}
                className="h-9 text-xs"
                title="Start date"
                aria-label="Start date"
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
      </Card>
    );
  }

  return (
    <Card className="zoho-card border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Daily brief
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Drag cards between columns — Schedule auto-sorts by due date.
          </p>
        </div>
        <Badge variant="outline" className="border-border/80 text-[11px]">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {addTaskForm}

      <DailyHubKanbanBoard
        scheduleRows={scheduleRows}
        userId={user?.id}
        completingId={completingId}
        onOpen={handleOpenForZone}
        onComplete={handleCompleteItem}
      />
    </Card>
  );
}
