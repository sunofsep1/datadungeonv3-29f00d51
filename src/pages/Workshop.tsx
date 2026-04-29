import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { ArrowLeft, CalendarClock, CheckCircle2, CheckSquare, ExternalLink, Loader2, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useTodos, useUpdateTodo } from "@/hooks/useTodos";
import { useAppointments } from "@/hooks/useAppointments";
import { useContact } from "@/hooks/useContact";
import { useContactTasks, useUpdateContactTask } from "@/hooks/useContactTasks";
import {
  usePendingStepRunsByTaskIds,
  useCompleteNurtureStepAndAdvance,
  isNurtureNoActiveStepError,
} from "@/hooks/useNurtureSequences";
import { useCreateActivityLog } from "@/hooks/useActivityLog";
import { ContactActivityTimeline } from "@/components/contacts/ContactActivityTimeline";
import { ContactWorkspaceRail } from "@/components/contacts/ContactWorkspaceRail";
import { getContactDisplayName, getPrimaryEmail, getPrimaryPhone } from "@/hooks/useContacts";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";
import { EmailComposeDialog } from "@/components/contacts/EmailComposeDialog";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { ReiqReadyReckonerCard } from "@/components/workshop/ReiqReadyReckonerCard";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybe = (error as { message?: unknown }).message;
    if (typeof maybe === "string" && maybe.trim()) return maybe;
  }
  return "Something went wrong.";
}

export default function Workshop() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const contactId = searchParams.get("contactId") ?? undefined;
  const contactTaskId = searchParams.get("contactTaskId") ?? undefined;
  const todoId = searchParams.get("todoId") ?? undefined;
  const appointmentId = searchParams.get("appointmentId") ?? undefined;
  const nurtureParam = searchParams.get("nurture") === "1";
  const reminderOnly = searchParams.get("reminder") === "1";

  const { data: contact, isLoading: contactLoading } = useContact(contactId);
  const { data: contactTasks = [], isLoading: tasksLoading } = useContactTasks(contactId);
  const { data: todos = [], isLoading: todosLoading } = useTodos();
  const { data: appointments = [], isLoading: apptsLoading } = useAppointments();

  const task = useMemo(
    () => (contactTaskId ? contactTasks.find((t) => t.id === contactTaskId) : undefined),
    [contactTaskId, contactTasks]
  );
  const todo = useMemo(() => (todoId ? todos.find((t) => t.id === todoId) : undefined), [todoId, todos]);
  const appointment = useMemo(
    () => (appointmentId ? appointments.find((a) => a.id === appointmentId) : undefined),
    [appointmentId, appointments]
  );

  const isSequenceTask = Boolean(task?.sequence_enrollment_id);
  const { data: pendingRuns = [] } = usePendingStepRunsByTaskIds(
    contactTaskId && isSequenceTask ? [contactTaskId] : []
  );
  const pendingRun = useMemo(() => pendingRuns.find((r) => r.task_id === contactTaskId), [contactTaskId, pendingRuns]);
  const stepId = pendingRun?.step_id ?? null;
  const { data: nurtureStep } = useQuery({
    queryKey: ["nurture_sequence_steps", "one", stepId],
    queryFn: async () => {
      if (!stepId) return null;
      const { data, error } = await supabase.from("nurture_sequence_steps").select("*").eq("id", stepId).maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
    enabled: Boolean(stepId),
  });

  const { data: listingPriceRow } = useQuery({
    queryKey: ["workshop_listing_price", contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const { data, error } = await supabase
        .from("listings")
        .select("price")
        .eq("contact_id", contactId)
        .not("price", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { price: number | null } | null;
    },
    enabled: Boolean(contactId),
  });
  const listingSuggestedPrice =
    listingPriceRow?.price != null && Number.isFinite(listingPriceRow.price) ? listingPriceRow.price : null;

  const updateTodo = useUpdateTodo();
  const updateContactTask = useUpdateContactTask();
  const completeNurtureStep = useCompleteNurtureStepAndAdvance();
  const createLog = useCreateActivityLog();

  const [completeNote, setCompleteNote] = useState("");
  const [workshopNote, setWorkshopNote] = useState("");
  const [completing, setCompleting] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const hasWorkParams = Boolean(todoId || contactTaskId || appointmentId || (reminderOnly && contactId));

  const handleComplete = useCallback(
    async (withNote: boolean) => {
      const note = withNote ? completeNote.trim() : "";
      setCompleting(true);
      try {
        if (todo && todoId) {
          if (todo.completed) {
            toast({ title: "Already done", description: "This task was already completed." });
            navigate("/attention-hub");
            return;
          }
          await updateTodo.mutateAsync({ id: todo.id, completed: true });
          toast({ title: "Completed", description: "Task marked as done." });
          navigate("/attention-hub");
          return;
        }

        if (task && contactId && contactTaskId) {
          if (task.completed_at) {
            toast({ title: "Already done", description: "This contact task is already completed." });
            navigate("/attention-hub");
            return;
          }
          const run = task.sequence_enrollment_id ? pendingRun : undefined;
          if (task.sequence_enrollment_id && run) {
            try {
              await completeNurtureStep.mutateAsync({
                enrollment_id: run.enrollment_id,
                step_run_id: run.id,
                contact_id: contactId,
                contact_task_id: contactTaskId,
                outcome: "completed",
                engagement_note: note || undefined,
              });
              toast({ title: "Step completed", description: "Nurture advanced to the next step." });
            } catch (sequenceError) {
              await updateContactTask.mutateAsync({
                id: contactTaskId,
                contact_id: contactId,
                completed_at: new Date().toISOString(),
                completion_note: note || null,
              });
              if (isNurtureNoActiveStepError(sequenceError)) {
                toast({
                  title: "Task completed",
                  description:
                    "The nurture sequence had already moved on; your task is marked done.",
                });
              } else {
                toast({
                  title: "Task completed",
                  description: `Sequence sync had an issue (${getErrorMessage(sequenceError)}). The task was still marked done.`,
                });
              }
            }
          } else {
            await updateContactTask.mutateAsync({
              id: contactTaskId,
              contact_id: contactId,
              completed_at: new Date().toISOString(),
              completion_note: note || null,
            });
            toast({ title: "Completed", description: "Contact task marked as done." });
          }
          navigate("/attention-hub");
        }
      } catch (error) {
        toast({ title: "Could not complete", description: getErrorMessage(error), variant: "destructive" });
      } finally {
        setCompleting(false);
      }
    },
    [completeNote, completeNurtureStep, contactId, contactTaskId, navigate, pendingRun, task, toast, todo, todoId, updateContactTask, updateTodo]
  );

  const handleSaveWorkshopNote = async () => {
    if (!contactId || !workshopNote.trim()) return;
    try {
      await createLog.mutateAsync({
        activity_type: "note",
        title: "Workshop note",
        description: workshopNote.trim(),
        contact_id: contactId,
        property_id: null,
        listing_id: null,
      });
      setWorkshopNote("");
      toast({ title: "Note saved", description: "Added to timeline." });
    } catch (error) {
      toast({ title: "Could not save note", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  if (!hasWorkParams) {
    return (
      <div className="container max-w-3xl py-8">
        <PageHeader title="Workshop" description="Open this page from Daily Hub → Work now on a focus item." />
        <Card className="zoho-card p-6 border-border space-y-3">
          <p className="text-sm text-muted-foreground">No task or appointment was specified.</p>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/attention-hub">Back to Daily Hub</Link></Button>
            <Button asChild variant="outline"><Link to="/work">Open legacy workspace</Link></Button>
          </div>
        </Card>
      </div>
    );
  }

  const loading =
    (todoId && todosLoading) ||
    (contactTaskId && contactId && tasksLoading) ||
    (appointmentId && apptsLoading) ||
    (contactId && contactLoading);

  if (loading) {
    return (
      <div className="container max-w-6xl py-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading workshop…</span>
      </div>
    );
  }

  const todoMissing = Boolean(todoId && !todosLoading && !todo);
  const taskMissing = Boolean(contactTaskId && contactId && !tasksLoading && !task);
  const apptMissing = Boolean(appointmentId && !apptsLoading && !appointment);
  const contactMissing = Boolean(reminderOnly && contactId && !contactLoading && !contact);
  if (todoMissing || taskMissing || apptMissing || contactMissing) {
    return (
      <div className="container max-w-2xl py-8">
        <PageHeader title="Workshop" description="This item may have been completed or removed." />
        <Card className="zoho-card p-6 border-border">
          <Button asChild variant="outline"><Link to="/attention-hub">Daily Hub</Link></Button>
        </Card>
      </div>
    );
  }

  const taskDue = task?.due_at ? new Date(task.due_at) : null;
  const taskDueText =
    taskDue && !Number.isNaN(taskDue.getTime())
      ? isPast(taskDue) && !isToday(taskDue)
        ? `Overdue since ${format(taskDue, "EEE d MMM")}`
        : isToday(taskDue)
          ? `Due today at ${format(taskDue, "h:mm a")}`
          : `Due ${formatDistanceToNow(taskDue, { addSuffix: true })}`
      : "No due date";

  const todoDue = todo?.due_at ? new Date(todo.due_at) : null;
  const todoDueText =
    todoDue && !Number.isNaN(todoDue.getTime())
      ? isPast(todoDue) && !isToday(todoDue)
        ? `Overdue since ${format(todoDue, "EEE d MMM")}`
        : isToday(todoDue)
          ? `Due today at ${format(todoDue, "h:mm a")}`
          : `Due ${formatDistanceToNow(todoDue, { addSuffix: true })}`
      : "No due date set";

  const appointmentWhen =
    appointment ? (isToday(new Date(appointment.date)) ? `Today at ${format(new Date(appointment.date), "h:mm a")}` : format(new Date(appointment.date), "EEE d MMM yyyy, h:mm a")) : null;

  const primaryPhone = contact ? getPrimaryPhone(contact) : null;
  const primaryEmail = contact ? getPrimaryEmail(contact) : null;
  const contactName = contact ? getContactDisplayName(contact) : null;
  const headline = appointment?.title ?? task?.title ?? todo?.title ?? contactName ?? "Workshop";
  const showComplete = Boolean(!reminderOnly && ((todo && !todo.completed) || (task && !task.completed_at && contactId && contactTaskId)));
  const contactForRail: Tables<"contacts"> | null = contact ? (contact as unknown as Tables<"contacts">) : null;

  return (
    <div className="container max-w-7xl py-6 pb-12">
      <div className="mb-3">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground" asChild>
          <Link to="/attention-hub"><ArrowLeft className="h-4 w-4" />Daily Hub</Link>
        </Button>
      </div>
      <PageHeader
        title={`Workshop: ${headline}`}
        description="Focused execution space for this priority item."
        actions={
          <div className="flex gap-2">
            {contactId ? (
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link to={`/contacts/${contactId}${nurtureParam || isSequenceTask ? "?nurtureFocus=1" : ""}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Full contact
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild><Link to="/work">Legacy workspace</Link></Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="zoho-card border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm">Welcome to your Workshop</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Run the next action first, then use tools below to progress the relationship.</p>
          </Card>

          <Card className="zoho-card p-5 border-border space-y-3">
            <div className="flex flex-wrap gap-2">
              {task ? <Badge variant="outline">{isSequenceTask ? "Sequence step" : "Contact task"}</Badge> : null}
              {appointment ? <Badge variant="outline">Appointment</Badge> : null}
              {todo ? <Badge variant="outline">General task</Badge> : null}
              {reminderOnly ? <Badge variant="outline">Contact reminder</Badge> : null}
            </div>
            {task ? <p className="text-sm text-muted-foreground">{taskDueText}</p> : null}
            {todo ? <p className="text-sm text-muted-foreground">{todoDueText}</p> : null}
            {appointmentWhen ? (
              <p className="text-sm flex items-center gap-2 text-foreground">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                {appointmentWhen}
              </p>
            ) : null}
            {task?.notes ? <p className="text-sm text-foreground whitespace-pre-wrap">{task.notes}</p> : null}
            {(nurtureParam || isSequenceTask) && nurtureStep && typeof nurtureStep.body === "string" ? (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Sequence guidance</p>
                <p className="text-sm whitespace-pre-wrap">{nurtureStep.body}</p>
              </div>
            ) : null}
            {showComplete ? (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-2"><CheckSquare className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Next action</p></div>
                <Textarea value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} placeholder="Outcome, promise, or next step..." className="min-h-[88px] text-sm mb-3" />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={completing} onClick={() => void handleComplete(false)}>
                    {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark done"}
                  </Button>
                  <Button size="sm" disabled={completing} onClick={() => void handleComplete(true)}>
                    {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note + done"}
                  </Button>
                </div>
              </div>
            ) : todo?.completed ? (
              <p className="text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                This task is already completed.
              </p>
            ) : null}
          </Card>

          <Card className="zoho-card p-5 border-border">
            <Accordion type="multiple" defaultValue={["notes", "timeline", "outreach"]}>
              <AccordionItem value="notes" className="border-border">
                <AccordionTrigger>Workshop notes</AccordionTrigger>
                <AccordionContent>
                  <Textarea value={workshopNote} onChange={(e) => setWorkshopNote(e.target.value)} className="min-h-[120px]" placeholder="Capture objections, insights, promises, and next moves..." />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={() => void handleSaveWorkshopNote()} disabled={!contactId || !workshopNote.trim() || createLog.isPending}>
                      {createLog.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to timeline"}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="outreach" className="border-border">
                <AccordionTrigger>Outreach compose</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={!primaryPhone} onClick={() => setSmsOpen(true)}>Compose SMS</Button>
                    <Button size="sm" variant="outline" disabled={!primaryEmail} onClick={() => setEmailOpen(true)}>Compose email</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="timeline" className="border-border">
                <AccordionTrigger>Timeline context</AccordionTrigger>
                <AccordionContent>
                  {contactId ? <ContactActivityTimeline contactId={contactId} compact limit={12} /> : <p className="text-sm text-muted-foreground">Timeline requires a linked contact.</p>}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        <div className="space-y-4">
          <MiniCalendar />
          <ReiqReadyReckonerCard key={contactId ?? "no-contact"} suggestedSalePrice={listingSuggestedPrice} />
          {contactForRail && contactId ? <ContactWorkspaceRail contact={contactForRail} contactId={contactId} /> : null}
        </div>
      </div>

      {contact && primaryPhone ? (
        <SendSmsDialog
          open={smsOpen}
          onOpenChange={setSmsOpen}
          to={primaryPhone}
          contactId={contactId}
          contactName={contactName ?? undefined}
          firstName={contact.first_name ?? null}
          lastName={contact.last_name ?? null}
        />
      ) : null}
      {contact && primaryEmail ? (
        <EmailComposeDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          to={primaryEmail}
          contactId={contactId}
          contactName={contactName ?? undefined}
        />
      ) : null}
    </div>
  );
}
