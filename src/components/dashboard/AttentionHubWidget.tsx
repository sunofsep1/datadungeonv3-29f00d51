import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  buildDailyHubItems,
  dailyHubBucketLabel,
  dailyHubKindLabel,
  partitionDailyHubItems,
  type DailyHubItem,
  type DailyHubScheduleBucket,
  type DailyHubScheduleRow,
} from "@/lib/dailyHubSchedule";
import { isoFromDateInput, todayDateInputValue } from "@/lib/localDateParse";
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
} from "@/hooks/useContactTasks";
import { useTodos, useAddTodo, useUpdateTodo } from "@/hooks/useTodos";
import { hrefForWorkNow } from "@/lib/attentionWorkWorkspace";
import {
  urgencyTierBadgeClass,
  urgencyTierContactNameClass,
  urgencyTierLabel,
  urgencyTierSpotlightCardClass,
  urgencyTierSpotlightRailClass,
} from "@/lib/urgencyTierStyles";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type AttentionItem = DailyHubItem;
type QueueRow = DailyHubScheduleRow;

const HUB_SECTIONS: DailyHubScheduleBucket[] = ["overdue", "today", "coming_up"];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybe = (error as { message?: unknown }).message;
    if (typeof maybe === "string" && maybe.trim()) return maybe;
  }
  return "Could not complete this item.";
}

function bucketBorderClass(bucket: QueueRow["bucket"]): string {
  if (bucket === "overdue") return "border-red-400/45 bg-red-500/[0.06]";
  if (bucket === "today") return "border-amber-400/45 bg-amber-500/[0.07]";
  return "border-border/70 bg-background/55";
}

function HubQueueCard({
  item,
  completing,
  onOpen,
  onComplete,
}: {
  item: QueueRow;
  completing: boolean;
  onOpen: (item: AttentionItem) => void;
  onComplete: (item: AttentionItem) => void;
}) {
  const isContactItem =
    item.kind === "contactTask" ||
    item.kind === "sequenceTask" ||
    item.kind === "nextTouchReminder" ||
    (item.kind === "appointment" && Boolean(item.contactId));
  const headline =
    item.kind === "todoTask"
      ? item.title
      : isContactItem && item.title
        ? item.title
        : item.kind === "appointment"
          ? item.title
          : item.detail;
  const subline =
    item.kind === "todoTask"
      ? "General task"
      : isContactItem && item.title
        ? item.detail
        : item.kind === "appointment"
          ? item.detail
          : item.title;
  const showDone =
    item.canComplete && item.kind !== "appointment" && item.kind !== "nextTouchReminder";

  return (
    <div
      className={cn(
        "flex min-h-[9rem] w-[min(100%,280px)] min-w-[260px] max-w-[280px] shrink-0 flex-row gap-2 overflow-hidden rounded-xl border p-2.5 shadow-sm",
        bucketBorderClass(item.bucket),
        urgencyTierSpotlightCardClass(item.urgency),
      )}
    >
      <div className={cn("w-1 shrink-0 self-stretch rounded-full", urgencyTierSpotlightRailClass(item.urgency))} />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <button type="button" className="min-w-0 text-left" onClick={() => onOpen(item)}>
          <p
            className={cn(
              "line-clamp-2 text-sm font-bold leading-snug tracking-tight",
              isContactItem ? urgencyTierContactNameClass(item.urgency) : "text-foreground",
            )}
          >
            {headline}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-foreground/85">{subline}</p>
          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{item.whenText}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge variant="outline" className="border-border/80 text-[10px]">
              {dailyHubKindLabel(item.kind)}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", urgencyTierBadgeClass(item.urgency))}>
              {urgencyTierLabel(item.urgency)}
            </Badge>
          </div>
        </button>
        <div className="flex gap-1.5">
          {showDone ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 flex-1 gap-1 px-2 text-[11px] font-semibold"
              disabled={completing}
              onClick={(event) => {
                event.stopPropagation();
                onComplete(item);
              }}
            >
              {completing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" aria-hidden />
              )}
              Done
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className={cn("h-7 gap-1 px-2.5 text-[11px] font-semibold shadow-sm", showDone ? "flex-1" : "w-full")}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(item);
            }}
          >
            {item.kind === "appointment" ? (
              <>
                <CalendarClock className="h-3 w-3" aria-hidden />
                Prep
              </>
            ) : (
              <>
                <Briefcase className="h-3 w-3" aria-hidden />
                Open
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function HubCategorySection({
  bucket,
  items,
  completingId,
  onOpen,
  onComplete,
}: {
  bucket: DailyHubScheduleBucket;
  items: QueueRow[];
  completingId: string | null;
  onOpen: (item: AttentionItem) => void;
  onComplete: (item: AttentionItem) => void;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide",
            bucket === "overdue" ? "text-red-300" : bucket === "today" ? "text-amber-200" : "text-muted-foreground",
          )}
        >
          {dailyHubBucketLabel(bucket)}
        </p>
        <Badge variant="outline" className="border-border/60 px-2 py-0 text-[10px]">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="px-0.5 text-xs text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="-mx-1 flex gap-2 overflow-x-auto overflow-y-visible pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-0 [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <HubQueueCard
              key={item.id}
              item={item}
              completing={completingId === item.id}
              onOpen={onOpen}
              onComplete={onComplete}
            />
          ))}
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

  const sections = useMemo(() => {
    const { overdueItems, todayItems, comingUpItems } = partitionDailyHubItems(items);
    return {
      overdue: overdueItems.map((item) => ({ ...item, bucket: "overdue" as const })),
      today: todayItems.map((item) => ({ ...item, bucket: "today" as const })),
      coming_up: comingUpItems.map((item) => ({ ...item, bucket: "coming_up" as const })),
    };
  }, [items]);

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
        toast({ title: "Done", description: "Task marked complete." });
      } catch (error) {
        toast({ title: "Could not complete", description: getErrorMessage(error), variant: "destructive" });
      } finally {
        setCompletingId(null);
      }
    },
    [toast, updateContactTask, updateTodo],
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
      toast({ title: "Add failed", description: getErrorMessage(error), variant: "destructive" });
    }
  }, [addTodo, addType, createContactTask, newContactId, newDueAt, newTitle, toast]);

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
    <Card className="zoho-card border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Daily brief
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Start dates show when to begin work — not when to finish.
          </p>
        </div>
        <Badge variant="outline" className="border-border/80 text-[11px]">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </Badge>
      </div>

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

      {HUB_SECTIONS.map((bucket) => (
        <HubCategorySection
          key={bucket}
          bucket={bucket}
          items={sections[bucket]}
          completingId={completingId}
          onOpen={handleOpenItem}
          onComplete={handleCompleteItem}
        />
      ))}
    </Card>
  );
}
