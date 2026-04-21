import { useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  FilePenLine,
  Handshake,
  Loader2,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { ContactActivityTimeline } from "@/components/contacts/ContactActivityTimeline";
import { EmailComposeDialog } from "@/components/contacts/EmailComposeDialog";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";
import { ContactWorkspaceRail } from "@/components/contacts/ContactWorkspaceRail";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAppointments } from "@/hooks/useAppointments";
import { useCreateActivityLog } from "@/hooks/useActivityLog";
import { useContact } from "@/hooks/useContact";
import { getContactDisplayName, getPrimaryEmail, getPrimaryPhone } from "@/hooks/useContacts";
import { useContactTasks, useUpdateContactTask } from "@/hooks/useContactTasks";
import {
  usePendingStepRunsByTaskIds,
  useCompleteNurtureStepAndAdvance,
} from "@/hooks/useNurtureSequences";
import { useTodos, useUpdateTodo } from "@/hooks/useTodos";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import type { Tables } from "@/integrations/supabase/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybe = (error as { message?: unknown }).message;
    if (typeof maybe === "string" && maybe.trim()) return maybe;
  }
  return "Something went wrong.";
}

export default function WorkWorkspace() {
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
  const task = useMemo(
    () => (contactTaskId ? contactTasks.find((t) => t.id === contactTaskId) : undefined),
    [contactTasks, contactTaskId]
  );

  const { data: todos = [], isLoading: todosLoading } = useTodos();
  const todo = useMemo(() => (todoId ? todos.find((t) => t.id === todoId) : undefined), [todoId, todos]);

  const { data: appointments = [], isLoading: apptsLoading } = useAppointments();
  const appointment = useMemo(
    () => (appointmentId ? appointments.find((a) => a.id === appointmentId) : undefined),
    [appointmentId, appointments]
  );

  const isSequenceTask = Boolean(task?.sequence_enrollment_id);
  const { data: pendingRuns = [] } = usePendingStepRunsByTaskIds(
    contactTaskId && isSequenceTask ? [contactTaskId] : []
  );
  const pendingRun = useMemo(
    () => pendingRuns.find((r) => r.task_id === contactTaskId),
    [contactTaskId, pendingRuns]
  );

  const stepId = pendingRun?.step_id ?? null;
  const { data: nurtureStep, isLoading: stepLoading } = useQuery({
    queryKey: ["nurture_sequence_steps", "one", stepId],
    queryFn: async () => {
      if (!stepId) return null;
      const { data, error } = await supabase
        .from("nurture_sequence_steps")
        .select("*")
        .eq("id", stepId)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
    enabled: Boolean(stepId),
  });

  const updateTodo = useUpdateTodo();
  const updateContactTask = useUpdateContactTask();
  const completeNurtureStep = useCompleteNurtureStepAndAdvance();

  const [completeNote, setCompleteNote] = useState("");
  const [completing, setCompleting] = useState(false);
  const [workshopTitle, setWorkshopTitle] = useState("");
  const [workshopBody, setWorkshopBody] = useState("");
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"sms" | "email">("sms");
  const createLog = useCreateActivityLog();

  const hasWorkParams = Boolean(todoId || contactTaskId || appointmentId || (reminderOnly && contactId));

  const primaryPhone = contact ? getPrimaryPhone(contact) : null;
  const primaryEmail = contact ? getPrimaryEmail(contact) : null;
  const contactName = contact ? getContactDisplayName(contact) : null;

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
              toast({
                title: "Task completed",
                description: `Sequence sync had an issue (${getErrorMessage(sequenceError)}). The task was still marked done.`,
              });
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
    [
      completeNote,
      completeNurtureStep,
      contactId,
      contactTaskId,
      navigate,
      pendingRun,
      task,
      toast,
      todo,
      todoId,
      updateContactTask,
      updateTodo,
    ]
  );

  if (!hasWorkParams) {
    return (
      <div className="container max-w-2xl py-8">
        <PageHeader title="Work session" description="Open this page from Daily Hub → Work now on a focus item." />
        <Card className="zoho-card p-6 border-border">
          <p className="text-sm text-muted-foreground mb-4">No task or appointment was specified.</p>
          <Button asChild variant="outline">
            <Link to="/attention-hub">Back to Daily Hub</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const loading =
    (todoId && todosLoading) ||
    (contactTaskId && contactId && tasksLoading) ||
    (appointmentId && apptsLoading) ||
    (contactId && contactLoading);

  const todoMissing = Boolean(todoId && !todosLoading && !todo);
  const taskMissing = Boolean(contactTaskId && contactId && !tasksLoading && !task);
  const apptMissing = Boolean(appointmentId && !apptsLoading && !appointment);

  if (loading) {
    return (
      <div className="container max-w-5xl py-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading workspace…</span>
      </div>
    );
  }

  const contactMissing = Boolean(reminderOnly && contactId && !contactLoading && !contact);

  if (todoMissing || taskMissing || apptMissing || contactMissing) {
    return (
      <div className="container max-w-2xl py-8">
        <PageHeader title="Work session" description="This item may have been completed or removed." />
        <Card className="zoho-card p-6 border-border space-y-4">
          <p className="text-sm text-muted-foreground">
            {todoMissing ? "That to-do was not found (it may already be done)." : null}
            {taskMissing ? "That contact task was not found (it may already be completed)." : null}
            {apptMissing ? "That appointment was not found." : null}
            {contactMissing ? "That contact was not found." : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/attention-hub">Daily Hub</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/tasks">Tasks</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const appointmentDate = appointment ? new Date(appointment.date) : null;
  const appointmentWhen =
    appointmentDate && !Number.isNaN(appointmentDate.getTime())
      ? isToday(appointmentDate)
        ? `Today at ${format(appointmentDate, "h:mm a")}`
        : format(appointmentDate, "EEE d MMM yyyy, h:mm a")
      : null;

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

  const headline =
    appointment?.title ??
    task?.title ??
    todo?.title ??
    (reminderOnly && contactName ? contactName : null) ??
    "Work session";

  const subline =
    appointment
      ? contactName
        ? `With ${contactName}`
        : "Appointment prep"
      : task
        ? contactName ?? "Contact task"
        : todo
          ? "General task"
          : reminderOnly
            ? "Touch or follow-up suggested by your hub"
            : "";

  const reminderNextTouch =
    reminderOnly && contact?.next_touch_date
      ? format(new Date(contact.next_touch_date), "EEE d MMM yyyy")
      : null;

  const showComplete = Boolean(
    !reminderOnly &&
      ((todo && !todo.completed) || (task && !task.completed_at && contactId && contactTaskId))
  );
  const canSaveWorkshopNote = Boolean(contactId && (workshopTitle.trim() || workshopBody.trim()));
  const welcomeGreeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  const contactForRail: Tables<"contacts"> | null = contact
    ? (contact as unknown as Tables<"contacts">)
    : null;

  const handleSaveWorkshopNote = async () => {
    if (!contactId) {
      toast({
        title: "No linked contact",
        description: "Workshop notes can be saved once this work item has a contact.",
        variant: "destructive",
      });
      return;
    }
    const title = workshopTitle.trim() || "Work desk note";
    const description = workshopBody.trim() || null;
    if (!description) {
      toast({
        title: "Add a note first",
        description: "Write at least one line in the workshop notes before saving.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createLog.mutateAsync({
        activity_type: "note",
        title,
        description,
        contact_id: contactId,
        property_id: null,
        listing_id: null,
      });
      setWorkshopTitle("");
      setWorkshopBody("");
      toast({ title: "Note saved", description: "Added to the contact timeline." });
    } catch (error) {
      toast({ title: "Could not save note", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <div className="container max-w-5xl py-6 pb-12">
      <div className="mb-4">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground" asChild>
          <Link to="/attention-hub">
            <ArrowLeft className="h-4 w-4" />
            Daily Hub
          </Link>
        </Button>
      </div>

      <PageHeader
        title={headline}
        description={subline}
        actions={
          contactId ? (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to={`/contacts/${contactId}${nurtureParam || isSequenceTask ? "?nurtureFocus=1" : ""}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                Full contact
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="space-y-5 min-w-0">
        <Card className="zoho-card p-5 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{welcomeGreeting}, let's get this done.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start with the next action, then open notes, outreach, and timeline context as needed.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <Badge variant={showComplete ? "secondary" : "outline"} className="font-normal gap-1">
                  <CheckSquare className="h-3 w-3" />
                  Next action
                </Badge>
                <Badge variant="outline" className="font-normal gap-1">
                  <NotebookPen className="h-3 w-3" />
                  Notes
                </Badge>
                <Badge variant="outline" className="font-normal gap-1">
                  <Handshake className="h-3 w-3" />
                  Outreach
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="zoho-card p-5 border-border space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {appointment ? (
              <Badge variant="outline">Appointment</Badge>
            ) : task ? (
              <>
                <Badge variant="outline">{isSequenceTask ? "Sequence step" : "Contact task"}</Badge>
                {nurtureParam || isSequenceTask ? (
                  <Badge variant="secondary" className="text-xs">
                    Nurture
                  </Badge>
                ) : null}
              </>
            ) : todo ? (
              <>
                <Badge variant="outline">General task</Badge>
                <Badge variant="outline" className="capitalize">
                  {todo.priority} priority
                </Badge>
              </>
            ) : reminderOnly ? (
              <Badge variant="outline">Contact reminder</Badge>
            ) : null}
          </div>

          {appointment ? (
            <div className="space-y-3 text-sm">
              {appointmentWhen ? (
                <p className="flex items-center gap-2 text-foreground">
                  <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                  {appointmentWhen}
                </p>
              ) : null}
              {appointment.location ? (
                <p className="text-muted-foreground">
                  <span className="text-foreground/80">Where:</span> {appointment.location}
                </p>
              ) : null}
              {appointment.notes ? (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                  <p className="text-foreground whitespace-pre-wrap">{appointment.notes}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Add notes in Appointments if you need a prep checklist.</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" asChild>
                  <Link to="/appointments">Open Appointments</Link>
                </Button>
                {contactId ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/contacts/${contactId}`}>Contact record</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {task ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{taskDueText}</p>
              {task.notes ? (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Task notes</p>
                  <p className="text-foreground whitespace-pre-wrap">{task.notes}</p>
                </div>
              ) : null}
              {(nurtureParam || isSequenceTask) && (stepLoading || nurtureStep) ? (
                <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sequence guidance</p>
                  {stepLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : nurtureStep ? (
                    <>
                      {typeof nurtureStep.title === "string" && nurtureStep.title ? (
                        <p className="font-medium text-foreground">{nurtureStep.title}</p>
                      ) : null}
                      {typeof nurtureStep.body === "string" && nurtureStep.body ? (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{nurtureStep.body}</p>
                      ) : null}
                      {typeof nurtureStep.email_subject === "string" && nurtureStep.email_subject ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">Email subject:</span> {nurtureStep.email_subject}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No step copy on file; use Scripts or full contact view.</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {todo ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">{todoDueText}</p>
              {todo.completed ? (
                <p className="text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  This task is already completed.
                </p>
              ) : null}
            </div>
          ) : null}

          {reminderOnly && contact ? (
            <div className="space-y-2 text-sm">
              <p className="text-foreground/90">
                There is no single task row for this. Your hub flagged this contact for relationship rhythm.
              </p>
              {reminderNextTouch ? (
                <p className="text-muted-foreground">
                  <span className="text-foreground/80">Next touch target:</span> {reminderNextTouch}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Set next touch on the full contact when you wrap up.</p>
              )}
            </div>
          ) : null}

          {contact && (primaryPhone || primaryEmail) ? (
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Outreach quick launch</p>
              <div className="flex flex-wrap gap-2">
                {primaryPhone ? (
                  <>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href={`tel:${primaryPhone}`}>
                        <Phone className="h-3.5 w-3.5" />
                        {formatPhoneDisplay(primaryPhone)}
                      </a>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setComposeMode("sms");
                        setSmsOpen(true);
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Compose SMS
                    </Button>
                  </>
                ) : null}
                {primaryEmail ? (
                  <>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href={`mailto:${primaryEmail}`}>
                        <Mail className="h-3.5 w-3.5" />
                        Email app
                      </a>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setComposeMode("email");
                        setEmailOpen(true);
                      }}
                    >
                      <FilePenLine className="h-3.5 w-3.5" />
                      Compose email
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {showComplete ? (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Next action</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Add an optional outcome note, then mark done to clear this from your hub.
              </p>
              <Textarea
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                placeholder="Outcome, promise, or next step..."
                className="min-h-[88px] text-sm mb-3"
              />
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" size="sm" disabled={completing} onClick={() => handleComplete(false)}>
                  {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark done"}
                </Button>
                <Button size="sm" disabled={completing} onClick={() => handleComplete(true)}>
                  {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note + done"}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="zoho-card p-5 border-border">
          <Accordion type="multiple" defaultValue={["notes", "outreach"]} className="w-full">
            <AccordionItem value="notes" className="border-border">
              <AccordionTrigger className="text-sm">Workshop notes</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <Textarea
                    value={workshopTitle}
                    onChange={(e) => setWorkshopTitle(e.target.value)}
                    placeholder="Note title (optional)"
                    className="min-h-[48px]"
                  />
                  <Textarea
                    value={workshopBody}
                    onChange={(e) => setWorkshopBody(e.target.value)}
                    placeholder="Capture what you learned, objections, and next moves..."
                    className="min-h-[120px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!canSaveWorkshopNote || createLog.isPending}
                      onClick={handleSaveWorkshopNote}
                    >
                      {createLog.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to timeline"}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="outreach" className="border-border">
              <AccordionTrigger className="text-sm">Compose outreach</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={composeMode === "sms" ? "default" : "outline"}
                      onClick={() => setComposeMode("sms")}
                      disabled={!primaryPhone}
                    >
                      SMS
                    </Button>
                    <Button
                      size="sm"
                      variant={composeMode === "email" ? "default" : "outline"}
                      onClick={() => setComposeMode("email")}
                      disabled={!primaryEmail}
                    >
                      Email
                    </Button>
                  </div>
                  {composeMode === "sms" ? (
                    <div className="rounded-md border border-border p-3 text-sm">
                      <p className="text-muted-foreground mb-2">
                        Open the SMS composer with templates, merge fields, signature, and compliance checks.
                      </p>
                      <Button size="sm" className="gap-2" disabled={!primaryPhone} onClick={() => setSmsOpen(true)}>
                        <MessageSquare className="h-3.5 w-3.5" />
                        Open SMS composer
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border p-3 text-sm">
                      <p className="text-muted-foreground mb-2">
                        Draft and send email directly, with timeline logging on send.
                      </p>
                      <Button size="sm" className="gap-2" disabled={!primaryEmail} onClick={() => setEmailOpen(true)}>
                        <Mail className="h-3.5 w-3.5" />
                        Open email composer
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="timeline" className="border-border">
              <AccordionTrigger className="text-sm">Timeline context</AccordionTrigger>
              <AccordionContent>
                {contactId ? (
                  <ContactActivityTimeline contactId={contactId} compact limit={12} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Timeline appears when this work item is linked to a contact.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tools" className="border-border">
              <AccordionTrigger className="text-sm">Workspace tools</AccordionTrigger>
              <AccordionContent>
                {contactForRail && contactId ? (
                  <ContactWorkspaceRail contact={contactForRail} contactId={contactId} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This is a general task with no linked contact. Use Scripts when you need talk tracks.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
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
