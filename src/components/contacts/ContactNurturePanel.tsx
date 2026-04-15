import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ListTodo,
  Sparkles,
  GitBranch,
  Loader2,
  ExternalLink,
  Pencil,
  Check,
  Mail,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import {
  useContactTasks,
  useCreateContactTask,
  useUpdateContactTask,
  useDeleteContactTask,
} from "@/hooks/useContactTasks";
import {
  useNurtureSequencesList,
  useNurtureEnrollmentsForContact,
  useEnrollNurtureSequence,
  useCompleteNurtureEnrollment,
  usePendingStepRunsByTaskIds,
  useCompleteNurtureStepAndAdvance,
  useSetNurtureEnrollmentCadencePaused,
  useAdvanceNurtureEnrollmentStep,
  NURTURE_SEQUENCE_STEP_RUNS_QUERY_KEY,
} from "@/hooks/useNurtureSequences";
import type { ContactWithMeta } from "@/hooks/useContacts";
import { errorMessageFromUnknown, cn } from "@/lib/utils";
import { toast } from "sonner";
import { clearPauseReason, getPauseReason, setPauseReason } from "@/lib/nurturePauseReasonStore";

function enrollmentPauseReasonText(
  e: { id: string; pause_reason?: string | null }
): string | null {
  const fromDb = e.pause_reason?.trim();
  if (fromDb) return fromDb;
  return getPauseReason(e.id);
}

function stepTypeShortLabel(t: string | null | undefined) {
  const s = (t ?? "").toLowerCase();
  if (s === "email") return "Email";
  if (s === "prompt") return "Prompt";
  return "Task";
}

interface ContactNurturePanelProps {
  contact: ContactWithMeta;
  contactId: string;
}

export function ContactNurturePanel({ contact, contactId }: ContactNurturePanelProps) {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading: tasksLoading } = useContactTasks(contactId);
  const createTask = useCreateContactTask();
  const updateTask = useUpdateContactTask();
  const deleteTask = useDeleteContactTask();

  const {
    data: sequences = [],
    isLoading: seqListLoading,
    isError: seqListError,
    error: seqListErr,
  } = useNurtureSequencesList();

  const enrollableSequences = useMemo(
    () =>
      sequences.filter((s) => s.is_active !== false && (s.steps?.length ?? 0) > 0),
    [sequences]
  );
  const { data: enrollments = [] } = useNurtureEnrollmentsForContact(contactId);
  const enrollSeq = useEnrollNurtureSequence();
  const completeEnrollment = useCompleteNurtureEnrollment();
  const setCadencePaused = useSetNurtureEnrollmentCadencePaused();
  const advanceNurtureStep = useAdvanceNurtureEnrollmentStep();

  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [sequencePick, setSequencePick] = useState<string>("");
  /** Per-enrollment target sequence id for "Switch to" */
  const [switchToSequenceId, setSwitchToSequenceId] = useState<Record<string, string>>({});

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed_at), [tasks]);
  const sequenceTaskIds = useMemo(
    () => openTasks.filter((t) => t.sequence_enrollment_id).map((t) => t.id),
    [openTasks]
  );
  const { data: pendingRuns = [] } = usePendingStepRunsByTaskIds(sequenceTaskIds);
  const completeAndAdvance = useCompleteNurtureStepAndAdvance();
  const pendingRunByTaskId = useMemo(() => {
    const map = new Map<string, (typeof pendingRuns)[number]>();
    pendingRuns.forEach((r) => {
      if (r.task_id) map.set(r.task_id, r);
    });
    return map;
  }, [pendingRuns]);

  const [engagementDialogOpen, setEngagementDialogOpen] = useState(false);
  const [engagementOutcome, setEngagementOutcome] = useState<"completed" | "skipped">("completed");
  const [engagementNotes, setEngagementNotes] = useState("");
  const [engagementTarget, setEngagementTarget] = useState<{
    task_id: string;
    enrollment_id: string;
    step_run_id: string;
    existing_notes: string | null;
  } | null>(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pauseReasonDraft, setPauseReasonDraft] = useState("");
  const [pauseTargetEnrollment, setPauseTargetEnrollment] = useState<string | null>(null);
  const completedTasks = useMemo(() => {
    return [...tasks]
      .filter((t) => t.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());
  }, [tasks]);

  const nextTouchHints = useMemo(() => {
    const hints: string[] = [];
    if (contact.pipeline_stage?.trim()) {
      hints.push(`Pipeline: ${contact.pipeline_stage.trim()}`);
    }
    if (enrollments.length > 0) {
      hints.push("Active nurture sequence — next step is scheduled.");
    }
    return hints.slice(0, 3);
  }, [contact, enrollments.length]);

  const handleAddTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    createTask.mutate(
      {
        contact_id: contactId,
        title,
        due_at: newDue ? new Date(newDue).toISOString() : null,
      },
      {
        onSuccess: () => {
          setNewTitle("");
          setNewDue("");
          toast.success("Task added");
        },
        onError: (e) => toast.error(errorMessageFromUnknown(e)),
      }
    );
  };

  const toggleTask = (id: string, completed: boolean, cid: string) => {
    updateTask.mutate({
      id,
      contact_id: cid,
      completed_at: completed ? new Date().toISOString() : null,
    });
  };

  const switchOptionsFor = (enrollmentId: string, currentSequenceId: string) =>
    enrollableSequences.filter(
      (s) =>
        s.id !== currentSequenceId &&
        !enrollments.some((o) => o.id !== enrollmentId && o.sequence_id === s.id)
    );

  const handleSwitchSequence = async (e: (typeof enrollments)[number]) => {
    const target = switchToSequenceId[e.id];
    if (!target) {
      toast.error("Choose a sequence to switch to");
      return;
    }
    try {
      await completeEnrollment.mutateAsync({ enrollment_id: e.id, contact_id: contactId });
      await enrollSeq.mutateAsync({
        contact_id: contactId,
        sequence_id: target,
        pause_followup_cadence: e.pause_followup_cadence ?? false,
      });
      setSwitchToSequenceId((prev) => {
        const next = { ...prev };
        delete next[e.id];
        return next;
      });
      toast.success("Switched to the new sequence");
    } catch (err) {
      toast.error(errorMessageFromUnknown(err));
    }
  };

  const submitEngagementAndAdvance = async () => {
    if (!engagementTarget) return;
    const trimmed = engagementNotes.trim();
    const engagementBody = trimmed ? trimmed : undefined;

    try {
      if (engagementBody) {
        const nextNotes = engagementTarget.existing_notes
          ? `${engagementTarget.existing_notes}\n\nEngagement: ${engagementBody}`
          : `Engagement: ${engagementBody}`;
        await updateTask.mutateAsync({
          id: engagementTarget.task_id,
          contact_id: contactId,
          notes: nextNotes,
        });
      }

      await completeAndAdvance.mutateAsync({
        enrollment_id: engagementTarget.enrollment_id,
        step_run_id: engagementTarget.step_run_id,
        contact_id: contactId,
        outcome: engagementOutcome,
        engagement_note: engagementBody,
      });

      toast.success(engagementOutcome === "skipped" ? "Step skipped. Sequence advanced." : "Step completed. Next step scheduled.");
      setEngagementDialogOpen(false);
      setEngagementTarget(null);
      setEngagementNotes("");
    } catch (err) {
      const msg = errorMessageFromUnknown(err);
      const enrollmentAlreadyClosed = /enrollment not found or already completed/i.test(msg);
      if (enrollmentAlreadyClosed && engagementTarget) {
        try {
          await updateTask.mutateAsync({
            id: engagementTarget.task_id,
            contact_id: contactId,
            completed_at: new Date().toISOString(),
          });
          await queryClient.invalidateQueries({ queryKey: NURTURE_SEQUENCE_STEP_RUNS_QUERY_KEY });
          await queryClient.invalidateQueries({ queryKey: ["nurture_sequence_enrollments"] });
          await queryClient.invalidateQueries({ queryKey: ["contact_tasks", contactId] });
          await queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
          toast.success(
            "That sequence step was already closed on the server. Your task is marked done and the list is refreshed.",
          );
          setEngagementDialogOpen(false);
          setEngagementTarget(null);
          setEngagementNotes("");
        } catch (e2) {
          toast.error(errorMessageFromUnknown(e2));
        }
        return;
      }
      toast.error(msg);
    }
  };

  return (
    <Card id="contact-nurture-panel" className="zoho-card scroll-mt-4 p-6 border-border print:hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Nurture & tasks</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" asChild>
          <Link to="/nurture">
            Manage sequences <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>

      {nextTouchHints.length > 0 && (
        <div className="mb-5 rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next touch</p>
          <ul className="text-sm text-foreground list-disc list-inside space-y-0.5">
            {nextTouchHints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Contact tasks</span>
        </div>
        {tasksLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        ) : (
          <ul className="space-y-2">
            {openTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-md border border-border/80 bg-background/50 px-3 py-2"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={(v) => {
                    if (v !== true) return;
                    const run = pendingRunByTaskId.get(t.id);
                    if (t.sequence_enrollment_id && run) {
                      setEngagementOutcome("completed");
                      setEngagementTarget({
                        task_id: t.id,
                        enrollment_id: run.enrollment_id,
                        step_run_id: run.id,
                        existing_notes: t.notes ?? null,
                      });
                      setEngagementNotes("");
                      setEngagementDialogOpen(true);
                      return;
                    }
                    toggleTask(t.id, true, contactId);
                  }}
                  className="mt-0.5"
                  aria-label="Mark complete"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.due_at && (
                    <p className="text-xs text-muted-foreground">Due {format(new Date(t.due_at), "d MMM yyyy")}</p>
                  )}
                  {t.notes && <p className="text-xs text-muted-foreground mt-2">{t.notes}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => deleteTask.mutate({ id: t.id, contact_id: contactId })}
                >
                  Clear
                </Button>
                {t.sequence_enrollment_id && pendingRunByTaskId.get(t.id) ? (
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8"
                      disabled={completeAndAdvance.isPending}
                      onClick={() => {
                        const run = pendingRunByTaskId.get(t.id);
                        if (!run || !t.sequence_enrollment_id) return;
                        setEngagementOutcome("completed");
                        setEngagementTarget({
                          task_id: t.id,
                          enrollment_id: run.enrollment_id,
                          step_run_id: run.id,
                          existing_notes: t.notes ?? null,
                        });
                        setEngagementNotes("");
                        setEngagementDialogOpen(true);
                      }}
                    >
                      Complete & next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={completeAndAdvance.isPending}
                      onClick={() => {
                        const run = pendingRunByTaskId.get(t.id);
                        if (!run || !t.sequence_enrollment_id) return;
                        setEngagementOutcome("skipped");
                        setEngagementTarget({
                          task_id: t.id,
                          enrollment_id: run.enrollment_id,
                          step_run_id: run.id,
                          existing_notes: t.notes ?? null,
                        });
                        setEngagementNotes("");
                        setEngagementDialogOpen(true);
                      }}
                    >
                      Skip
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {completedTasks.length > 0 ? (
          <Collapsible defaultOpen className="rounded-md border border-border/60 bg-muted/15">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors [&[data-state=open]>svg]:rotate-180">
              <span>Completed tasks ({completedTasks.length})</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="space-y-1.5 px-3 pb-3 pt-0 border-t border-border/50">
                {completedTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start gap-2 rounded-md border border-border/50 bg-background/40 px-2.5 py-2"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/70">
                        {t.title}
                      </p>
                      {t.completed_at && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Done {format(new Date(t.completed_at), "d MMM yyyy, h:mm a")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Input
            placeholder="New task…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bg-input flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          />
          <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="bg-input w-full sm:w-[140px]" />
          <Button size="sm" onClick={handleAddTask} disabled={!newTitle.trim() || createTask.isPending}>
            Add
          </Button>
        </div>

        <Dialog
          open={engagementDialogOpen}
          onOpenChange={(open) => {
            setEngagementDialogOpen(open);
            if (!open) {
              setEngagementTarget(null);
              setEngagementNotes("");
            }
          }}
        >
          <DialogContent className="sm:max-w-[520px] bg-popover border-border">
            <DialogHeader>
              <DialogTitle>Complete this step</DialogTitle>
              <DialogDescription>Optionally log what you did (notes/outcome). This will be attached to the task and contact activity.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Engagement notes</Label>
              <Textarea
                className="bg-input min-h-[110px]"
                placeholder="e.g. Called, confirmed plan, discussed timeline..."
                value={engagementNotes}
                onChange={(e) => setEngagementNotes(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={completeAndAdvance.isPending || updateTask.isPending}
                onClick={() => {
                  setEngagementDialogOpen(false);
                  setEngagementTarget(null);
                  setEngagementNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!engagementTarget || completeAndAdvance.isPending || updateTask.isPending}
                onClick={() => void submitEngagementAndAdvance()}
              >
                {engagementOutcome === "skipped" ? "Skip step" : "Complete & next"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sequences */}
      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Nurture sequences</span>
        </div>
        {enrollments.length > 0 ? (
          <ul className="space-y-2">
            {enrollments.map((e) => {
              const seq = sequences.find((s) => s.id === e.sequence_id);
              const switchOpts = switchOptionsFor(e.id, e.sequence_id);
              const journeySteps = [...(seq?.steps ?? [])].sort((a, b) => a.sort_order - b.sort_order);
              const totalJourney = journeySteps.length;
              const rawIdx = e.current_step_index;
              const completedSteps = totalJourney > 0 ? Math.min(rawIdx, totalJourney) : 0;
              return (
                <li key={e.id} className="rounded-md border border-border px-3 py-3 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{seq?.name ?? "Sequence"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Enrolled {format(new Date(e.started_at), "d MMM yyyy, h:mm a")}
                        {" · "}
                        Manual enrollments usually add a &quot;Nurture sequence started&quot; line on the contact
                        timeline above.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Next: {e.next_step_at ? format(new Date(e.next_step_at), "d MMM yyyy, h:mm a") : "—"}
                        {e.pause_followup_cadence && " · Cadence paused"}
                      </p>
                      {totalJourney > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {completedSteps} of {totalJourney} step{totalJourney === 1 ? "" : "s"} completed
                          {rawIdx < totalJourney && totalJourney > 0
                            ? ` · Step ${rawIdx + 1} is up next`
                            : rawIdx >= totalJourney
                              ? " · sequence finishing"
                              : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
                        <Link to={`/nurture?edit=${e.sequence_id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                          Edit template
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          completeEnrollment.mutate(
                            { enrollment_id: e.id, contact_id: contactId },
                            {
                              onSuccess: () => toast.success("Sequence ended"),
                              onError: (err) => toast.error(errorMessageFromUnknown(err)),
                            }
                          )
                        }
                        disabled={completeEnrollment.isPending}
                      >
                        End
                      </Button>
                      <Button
                        size="sm"
                        variant={e.pause_followup_cadence ? "secondary" : "ghost"}
                        onClick={() => {
                          if (e.pause_followup_cadence) {
                            setCadencePaused.mutate(
                              { enrollment_id: e.id, pause_followup_cadence: false },
                              {
                                onSuccess: () => {
                                  clearPauseReason(e.id);
                                  toast.success("Cadence resumed");
                                },
                                onError: (err) => toast.error(errorMessageFromUnknown(err)),
                              }
                            );
                            return;
                          }
                          setPauseTargetEnrollment(e.id);
                          setPauseReasonDraft(enrollmentPauseReasonText(e) ?? "");
                          setPauseDialogOpen(true);
                        }}
                        disabled={setCadencePaused.isPending}
                      >
                        {e.pause_followup_cadence ? "Resume cadence" : "Pause cadence"}
                      </Button>
                    </div>
                  </div>
                  {e.pause_followup_cadence && enrollmentPauseReasonText(e) && (
                    <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-medium">Paused reason: </span>
                      {enrollmentPauseReasonText(e)}
                    </div>
                  )}
                  {journeySteps.length > 0 ? (
                    <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2.5 space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Sequence journey
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Finished a step before its scheduled time? Use{" "}
                        <span className="font-medium text-foreground">Complete &amp; next</span> on the current step to
                        move the sequence forward. Automated emails for skipped steps are not sent.
                      </p>
                      <ol className="space-y-0">
                        {journeySteps.map((step, i) => {
                          const done = rawIdx > i || rawIdx >= totalJourney;
                          const current = rawIdx === i && rawIdx < totalJourney;
                          const cleanTitle = step.title?.replace(/^\[Sequence\]\s*/i, "").trim() || "Step";
                          return (
                            <li
                              key={step.id}
                              className={cn(
                                "flex gap-2 py-2 border-b border-border/60 last:border-b-0 last:pb-0 first:pt-0",
                                current && "rounded-md -mx-1 px-1 -my-0.5 py-2 border-b-0 bg-primary/8 ring-1 ring-primary/25"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums mt-0.5",
                                  done && "border-muted-foreground/35 bg-muted/50 text-muted-foreground",
                                  current && "border-primary bg-primary/15 text-primary",
                                  !done && !current && "border-border text-muted-foreground"
                                )}
                                aria-hidden
                              >
                                {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : i + 1}
                              </span>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <div className="flex flex-wrap items-center gap-1.5 gap-y-0">
                                  <span
                                    className={cn(
                                      "text-sm font-medium leading-snug",
                                      done && "line-through text-muted-foreground decoration-muted-foreground/80",
                                      current && "text-foreground",
                                      !done && !current && "text-muted-foreground"
                                    )}
                                  >
                                    {cleanTitle}
                                  </span>
                                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1 py-px inline-flex items-center gap-0.5 shrink-0">
                                    {step.step_type === "email" ? (
                                      <Mail className="w-3 h-3" aria-hidden />
                                    ) : (
                                      <ListTodo className="w-3 h-3" aria-hidden />
                                    )}
                                    {stepTypeShortLabel(step.step_type)}
                                  </span>
                                  {current && (
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-primary shrink-0">
                                      Up next
                                    </span>
                                  )}
                                </div>
                                {step.offset_days != null && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    +{step.offset_days} day{step.offset_days === 1 ? "" : "s"} from start
                                  </p>
                                )}
                                {current && rawIdx < totalJourney ? (
                                  <div className="mt-2 space-y-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      className="h-8 text-xs"
                                      disabled={advanceNurtureStep.isPending}
                                      onClick={() =>
                                        advanceNurtureStep.mutate(
                                          { enrollment_id: e.id, contact_id: contactId },
                                          {
                                            onSuccess: (data) => {
                                              if (data.finished) toast.success("Sequence completed");
                                              else toast.success("Step marked done — next step is now current");
                                            },
                                            onError: (err) => toast.error(errorMessageFromUnknown(err)),
                                          }
                                        )
                                      }
                                    >
                                      {advanceNurtureStep.isPending ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                          Updating…
                                        </>
                                      ) : (
                                        "Complete & next"
                                      )}
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ) : null}
                  {switchOpts.length > 0 ? (
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-1 border-t border-border/80">
                      <span className="text-xs text-muted-foreground self-center sm:self-end">Switch to</span>
                      <Select
                        value={switchToSequenceId[e.id] ?? ""}
                        onValueChange={(v) => setSwitchToSequenceId((prev) => ({ ...prev, [e.id]: v }))}
                      >
                        <SelectTrigger className="bg-input h-9 flex-1 min-w-[160px]">
                          <SelectValue placeholder="Another sequence…" />
                        </SelectTrigger>
                        <SelectContent>
                          {switchOpts.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!switchToSequenceId[e.id] || completeEnrollment.isPending || enrollSeq.isPending}
                        onClick={() => handleSwitchSequence(e)}
                      >
                        Switch
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No active sequence.</p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Enroll in sequence</Label>
            {seqListLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sequences…
              </div>
            ) : seqListError ? (
              <p className="text-sm text-destructive py-1">{errorMessageFromUnknown(seqListErr)}</p>
            ) : enrollableSequences.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                <p className="text-foreground font-medium">Nothing to enroll</p>
                <p className="mt-1">
                  <Link to="/nurture" className="text-primary underline underline-offset-2 font-medium">
                    Nurture
                  </Link>
                </p>
              </div>
            ) : (
              <Select value={sequencePick} onValueChange={setSequencePick}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Choose sequence…" />
                </SelectTrigger>
                <SelectContent>
                  {enrollableSequences.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button
            size="sm"
            disabled={!sequencePick || enrollSeq.isPending || enrollableSequences.length === 0}
            onClick={() =>
              enrollSeq.mutate(
                { contact_id: contactId, sequence_id: sequencePick },
                {
                  onSuccess: () => {
                    setSequencePick("");
                    toast.success("Enrolled in sequence");
                  },
                  onError: (e: unknown) => {
                    const msg = errorMessageFromUnknown(e);
                    const code =
                      typeof e === "object" && e !== null && "code" in e
                        ? String((e as { code: unknown }).code)
                        : "";
                    toast.error(
                      code === "23505" || /duplicate|unique/i.test(msg)
                        ? "Already enrolled in this sequence."
                        : msg
                    );
                  },
                }
              )
            }
          >
            Enroll
          </Button>
        </div>
      </div>

      <Dialog
        open={pauseDialogOpen}
        onOpenChange={(open) => {
          setPauseDialogOpen(open);
          if (!open) {
            setPauseTargetEnrollment(null);
            setPauseReasonDraft("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px] bg-popover border-border">
          <DialogHeader>
            <DialogTitle>Pause cadence</DialogTitle>
            <DialogDescription>
              Add a reason so future you knows why this sequence was paused.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Reason</Label>
            <Textarea
              className="bg-input min-h-[100px]"
              placeholder="e.g. Owner requested no follow-up until after Easter."
              value={pauseReasonDraft}
              onChange={(e) => setPauseReasonDraft(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPauseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!pauseTargetEnrollment || setCadencePaused.isPending}
              onClick={() => {
                if (!pauseTargetEnrollment) return;
                const reason = pauseReasonDraft.trim();
                setCadencePaused.mutate(
                  {
                    enrollment_id: pauseTargetEnrollment,
                    pause_followup_cadence: true,
                    pause_reason: reason || null,
                  },
                  {
                    onSuccess: () => {
                      if (reason) setPauseReason(pauseTargetEnrollment, reason);
                      toast.success("Cadence paused");
                      setPauseDialogOpen(false);
                      setPauseTargetEnrollment(null);
                      setPauseReasonDraft("");
                    },
                    onError: (err) => toast.error(errorMessageFromUnknown(err)),
                  }
                );
              }}
            >
              Pause cadence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
