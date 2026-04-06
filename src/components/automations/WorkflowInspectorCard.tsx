import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CRM_WORKFLOW_STEP_ACTIONS_FORM,
  useAppendCrmWorkflowStep,
  useCrmWorkflowsList,
  useCrmWorkflowSteps,
  useCrmWorkflowEnrollmentsForWorkflow,
  useCrmWorkflowStepRunsForWorkflow,
  useUpdateCrmWorkflowStepDelay,
  type CrmWorkflowStep,
} from "@/hooks/useCrmWorkflows";
import { useContacts } from "@/hooks/useContacts";
import { GitBranch, History, ListTree, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function summarizeStepConfig(actionType: string, config: unknown): string {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    return "—";
  }
  const o = config as Record<string, unknown>;
  switch (actionType) {
    case "notify_user":
      return String(o.title ?? o.body ?? "notification");
    case "create_task":
      return String(o.title ?? "task");
    case "send_sms":
      return o.body ? String(o.body).slice(0, 60) + (String(o.body).length > 60 ? "…" : "") : "SMS";
    case "send_email":
      return String(o.subject ?? o.title ?? "email");
    case "if_branch":
      return "Branch";
    case "update_contact":
      return "Update fields";
    default:
      return JSON.stringify(config).slice(0, 72) + (JSON.stringify(config).length > 72 ? "…" : "");
  }
}

function branchHint(step: CrmWorkflowStep): string | null {
  if (step.action_type !== "if_branch") return null;
  const t = step.next_step_order_if_true;
  const f = step.next_step_order_if_false;
  if (t == null && f == null) return null;
  return `true → ${t ?? "—"} · false → ${f ?? "—"}`;
}

function StepDelayEditor({ step, workflowId }: { step: CrmWorkflowStep; workflowId: string }) {
  const update = useUpdateCrmWorkflowStepDelay();
  const [v, setV] = useState(String(step.delay_minutes ?? 0));
  useEffect(() => {
    setV(String(step.delay_minutes ?? 0));
  }, [step.id, step.delay_minutes]);

  const commit = () => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) {
      setV(String(step.delay_minutes ?? 0));
      return;
    }
    if (n === (step.delay_minutes ?? 0)) return;
    update.mutate(
      { stepId: step.id, workflowId, delayMinutes: n },
      {
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update delay"),
      },
    );
  };

  return (
    <Input
      className="h-8 w-[4.5rem] text-xs tabular-nums bg-input"
      inputMode="numeric"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      disabled={update.isPending}
    />
  );
}

function WorkflowStepFormBuilder({ workflowId }: { workflowId: string }) {
  const append = useAppendCrmWorkflowStep();
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState<string>(CRM_WORKFLOW_STEP_ACTIONS_FORM[0]);
  const [delayStr, setDelayStr] = useState("0");

  const onAdd = () => {
    const d = parseInt(delayStr, 10);
    append.mutate(
      { workflowId, actionType, delayMinutes: Number.isFinite(d) ? d : 0 },
      {
        onSuccess: () => {
          toast.success("Step added at end of chain");
          setOpen(false);
          setDelayStr("0");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add step"),
      },
    );
  };

  return (
    <div className="mt-4 rounded-lg border border-dashed border-border/80 bg-muted/10 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-foreground">Form step builder</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Append linear steps (wait, notify, task). Branching and outbound sends stay in SQL or advanced config for
            now.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add step
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add workflow step</DialogTitle>
            <DialogDescription>
              New step is appended with the next <span className="font-medium text-foreground">step_order</span>. Adjust
              delay minutes before the step runs (after the previous step completes).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_WORKFLOW_STEP_ACTIONS_FORM.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Delay before this step (minutes)</Label>
              <Input
                className="bg-input tabular-nums"
                inputMode="numeric"
                value={delayStr}
                onChange={(e) => setDelayStr(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onAdd} disabled={append.isPending}>
              {append.isPending ? "Adding…" : "Add step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Props = {
  workflowId: string;
  onWorkflowIdChange: (id: string) => void;
};

export function WorkflowInspectorCard({ workflowId, onWorkflowIdChange }: Props) {
  const { data: workflows = [], isLoading: wfLoading } = useCrmWorkflowsList();
  const { data: steps = [], isLoading: stepsLoading } = useCrmWorkflowSteps(workflowId || undefined);
  const { data: enrollments = [], isLoading: enLoading } = useCrmWorkflowEnrollmentsForWorkflow(
    workflowId || undefined,
  );
  const {
    data: stepRuns = [],
    isLoading: runsLoading,
    isError: runsError,
    error: runsQueryError,
  } = useCrmWorkflowStepRunsForWorkflow(workflowId || undefined);
  const { data: contacts = [] } = useContacts();

  const contactNameById = useMemo(() => new Map(contacts.map((c) => [c.id, c.name ?? "Contact"])), [contacts]);

  const enrollmentContactById = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const e of enrollments) m.set(e.id, e.contact_id ?? null);
    return m;
  }, [enrollments]);

  const selectedMeta = workflows.find((w) => w.id === workflowId);

  return (
    <Card className="zoho-card p-4 sm:p-5 border-border">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ListTree className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Workflow inspector</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step chain and recent enrollments for the selected definition. Click a row in the directory above or choose here.
            </p>
          </div>
        </div>
        <div className="space-y-1.5 w-full sm:w-72 shrink-0">
          <Label className="text-xs">Workflow</Label>
          <Select value={workflowId} onValueChange={onWorkflowIdChange} disabled={wfLoading || workflows.length === 0}>
            <SelectTrigger className="bg-input">
              <SelectValue placeholder={wfLoading ? "Loading…" : "Select workflow"} />
            </SelectTrigger>
            <SelectContent>
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                  {!w.is_active ? " (paused)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!workflowId ? (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          No workflow selected.
        </p>
      ) : (
        <>
          {selectedMeta?.description ? (
            <p className="text-xs text-muted-foreground mb-4 border-l-2 border-primary/40 pl-3">{selectedMeta.description}</p>
          ) : null}

          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="mb-3 h-auto min-h-9 flex flex-wrap gap-1 py-1">
              <TabsTrigger value="steps" className="gap-1.5 text-xs">
                <GitBranch className="h-3.5 w-3.5" />
                Steps
                {steps.length > 0 ? (
                  <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
                    {steps.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="enrollments" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                Enrollments
                {enrollments.length > 0 ? (
                  <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
                    {enrollments.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="step-log" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Step log
                {stepRuns.length > 0 ? (
                  <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
                    {stepRuns.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="mt-0">
              {stepsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : steps.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                  No steps on this workflow.
                </p>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[480px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="py-2.5 px-3 font-medium tabular-nums">#</th>
                        <th className="py-2.5 px-3 font-medium">Action</th>
                        <th className="py-2.5 px-3 font-medium tabular-nums">Delay (min)</th>
                        <th className="py-2.5 px-3 font-medium">Summary</th>
                        <th className="py-2.5 px-3 font-medium">Branch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((s) => {
                        const bh = branchHint(s);
                        return (
                          <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                            <td className="py-2.5 px-3 tabular-nums text-muted-foreground">{s.step_order}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="font-normal text-[10px]">
                                {s.action_type?.replace(/_/g, " ") ?? "—"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <StepDelayEditor step={s} workflowId={workflowId} />
                            </td>
                            <td className="py-2.5 px-3 text-xs text-foreground max-w-[220px]">
                              <span className="line-clamp-2">{summarizeStepConfig(s.action_type, s.action_config)}</span>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[140px]">
                              {bh ? <span className="line-clamp-2">{bh}</span> : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <WorkflowStepFormBuilder workflowId={workflowId} />
            </TabsContent>

            <TabsContent value="enrollments" className="mt-0">
              {enLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                  No enrollments yet. Start one from the card below or via listing stage triggers.
                </p>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="py-2.5 px-3 font-medium">Record</th>
                        <th className="py-2.5 px-3 font-medium">Status</th>
                        <th className="py-2.5 px-3 font-medium tabular-nums">Step</th>
                        <th className="py-2.5 px-3 font-medium">Next action</th>
                        <th className="py-2.5 px-3 font-medium">Enrolled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((e) => {
                        const contactName = e.contact_id ? contactNameById.get(e.contact_id) : null;
                        return (
                          <tr key={e.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                            <td className="py-2.5 px-3">
                              {e.contact_id ? (
                                <Link
                                  to={`/contacts/${e.contact_id}`}
                                  className="text-primary hover:underline font-medium text-xs line-clamp-2"
                                >
                                  {contactName ?? "Contact"}
                                </Link>
                              ) : e.listing_id ? (
                                <Link
                                  to={`/listings/${e.listing_id}`}
                                  className="text-primary hover:underline font-medium text-xs"
                                >
                                  Listing
                                </Link>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={cn(
                                  "text-xs font-medium capitalize",
                                  e.status === "active" && "text-emerald-600 dark:text-emerald-400",
                                  e.status === "paused" && "text-amber-600 dark:text-amber-400",
                                  e.status === "completed" && "text-muted-foreground",
                                  e.status === "cancelled" && "text-destructive/80",
                                )}
                              >
                                {e.status ?? "—"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 tabular-nums text-muted-foreground">{e.current_step_order}</td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                              {e.status === "active" && e.next_action_at
                                ? formatDistanceToNow(new Date(e.next_action_at), { addSuffix: true })
                                : e.completed_at
                                  ? format(new Date(e.completed_at), "d MMM yy")
                                  : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(e.enrolled_at), "d MMM yyyy, HH:mm")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="step-log" className="mt-0">
              <p className="text-[11px] text-muted-foreground mb-3">
                Written by the <code className="text-[10px] text-foreground/90">process-workflows</code> job after each step.
                Deploy migration <code className="text-[10px]">20260405180000_crm_workflow_step_runs.sql</code> if this stays empty or errors.
              </p>
              {runsError ? (
                <p className="text-sm text-destructive py-4 px-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  Could not load step log: {runsQueryError instanceof Error ? runsQueryError.message : String(runsQueryError)}
                </p>
              ) : runsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : stepRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                  No processor runs recorded yet. After cron runs, successful and failed steps appear here.
                </p>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="py-2.5 px-3 font-medium whitespace-nowrap">When</th>
                        <th className="py-2.5 px-3 font-medium">Contact</th>
                        <th className="py-2.5 px-3 font-medium tabular-nums">Step</th>
                        <th className="py-2.5 px-3 font-medium">Action</th>
                        <th className="py-2.5 px-3 font-medium">Result</th>
                        <th className="py-2.5 px-3 font-medium">Branch</th>
                        <th className="py-2.5 px-3 font-medium">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stepRuns.map((r) => {
                        const cid = enrollmentContactById.get(r.enrollment_id) ?? null;
                        const cname = cid ? contactNameById.get(cid) : null;
                        return (
                          <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                            <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(r.executed_at), { addSuffix: true })}
                            </td>
                            <td className="py-2.5 px-3 text-xs">
                              {cid ? (
                                <Link to={`/contacts/${cid}`} className="text-primary hover:underline line-clamp-2">
                                  {cname ?? "Contact"}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground font-mono text-[10px]" title={r.enrollment_id}>
                                  {r.enrollment_id.slice(0, 8)}…
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 tabular-nums text-muted-foreground">{r.step_order}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="font-normal text-[10px]">
                                {r.action_type?.replace(/_/g, " ") ?? "—"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={cn(
                                  "text-xs font-medium capitalize",
                                  r.status === "success" && "text-emerald-600 dark:text-emerald-400",
                                  r.status === "failed" && "text-destructive",
                                  r.status === "branch" && "text-sky-600 dark:text-sky-400",
                                  r.status === "skipped" && "text-muted-foreground",
                                )}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground">
                              {r.branch_taken === true ? "Yes" : r.branch_taken === false ? "No" : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[200px]">
                              <span className="line-clamp-2 break-words" title={r.detail ?? undefined}>
                                {r.detail ?? "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </Card>
  );
}
