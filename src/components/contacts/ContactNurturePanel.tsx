import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListTodo, Sparkles, GitBranch, Loader2, ExternalLink, Pencil } from "lucide-react";
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
} from "@/hooks/useNurtureSequences";
import type { ContactWithMeta } from "@/hooks/useContacts";
import { errorMessageFromUnknown } from "@/lib/utils";
import { toast } from "sonner";

interface ContactNurturePanelProps {
  contact: ContactWithMeta;
  contactId: string;
}

export function ContactNurturePanel({ contact, contactId }: ContactNurturePanelProps) {
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
      toast.error(errorMessageFromUnknown(err));
    }
  };

  return (
    <Card className="zoho-card p-6 border-border print:hidden">
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
                        enrollment_id: t.sequence_enrollment_id,
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
                          enrollment_id: t.sequence_enrollment_id,
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
                          enrollment_id: t.sequence_enrollment_id,
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
              return (
                <li key={e.id} className="rounded-md border border-border px-3 py-3 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{seq?.name ?? "Sequence"}</p>
                      <p className="text-xs text-muted-foreground">
                        Next: {e.next_step_at ? format(new Date(e.next_step_at), "d MMM yyyy, h:mm a") : "—"}
                        {e.pause_followup_cadence && " · Cadence paused"}
                      </p>
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
                        onClick={() =>
                          setCadencePaused.mutate(
                            { enrollment_id: e.id, pause_followup_cadence: !e.pause_followup_cadence },
                            {
                              onSuccess: () =>
                                toast.success(e.pause_followup_cadence ? "Cadence resumed" : "Cadence paused"),
                              onError: (err) => toast.error(errorMessageFromUnknown(err)),
                            }
                          )
                        }
                        disabled={setCadencePaused.isPending}
                      >
                        {e.pause_followup_cadence ? "Resume cadence" : "Pause cadence"}
                      </Button>
                    </div>
                  </div>
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
                <p>
                  No enrollable sequences. Manage in{" "}
                  <Link to="/nurture" className="text-primary underline underline-offset-2 font-medium">
                    Nurture
                  </Link>
                  .
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
    </Card>
  );
}
