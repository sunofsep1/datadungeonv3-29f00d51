import { useCallback, useMemo, useState } from "react";
import { format, setHours, setMilliseconds, setMinutes, setSeconds } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClawMascot } from "@/components/brand/ClawMascot";
import {
  useAIOpsItems,
  useAIOpsRuns,
  useConfirmAndExecuteAIOpsRun,
  useCreateAIOpsDraftRun,
  useSetAIOpsItemStatus,
  useSetAIOpsRunStatus,
  type AIOpsActionItem,
} from "@/hooks/useAIActions";
import { useAIUsageSummary } from "@/hooks/useAIUsage";
import { useAuth } from "@/contexts/AuthContext";
import { useContacts, type ContactWithMeta, getContactDisplayName } from "@/hooks/useContacts";
import {
  CLAUDE_PROMPT_PACK,
  applyClaudePromptPackTemplate,
  type ClaudePromptPackEntry,
} from "@/lib/aiOpsClaudePromptPack";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  CheckCheck,
  CircleDollarSign,
  ClipboardList,
  Library,
  Loader2,
  Play,
  Sparkles,
  Wand2,
  XCircle,
  Copy,
  FileInput,
} from "lucide-react";

const STARTER_PROMPTS: string[] = [
  "Create follow-up tasks for my 10 warm leads due tomorrow at 9:00.",
  "Find contacts missing next_touch_date and draft tasks to schedule a touch this week.",
  "Create a call-list task batch for cold warm_lead contacts untouched for 14+ days.",
  "Draft touch-note reminders for my top 5 newest contacts.",
  "Prepare a reactivation task sequence for contacts with stale last_touch_date.",
  "Create quick follow-up tasks for referral_partner contacts with no activity this month.",
  "Generate tasks for seller_nurture contacts to confirm motivation and timing.",
  "Set next_touch_date this Friday for the first 8 warm leads and create follow-up tasks.",
  "Create check-in tasks for past_client contacts with no touch in 30+ days.",
  "Draft a weekend SMS follow-up prep task for high-priority contacts.",
  "Generate post-open-home follow-up tasks for leads added this week.",
  "Create task reminders to verify email + mobile fields on incomplete contacts.",
  "Draft call tasks for all contacts tagged as appraisal-related this week.",
  "Create tasks to review and reclassify warm_lead contacts with low engagement.",
  "Build a Monday morning outreach task pack for the first 12 active leads.",
];

const ADVANCED_PROMPTS: string[] = [
  "Plan a two-pass outreach run: create follow-up tasks first, then add touch-note drafts for the same contacts.",
  "Generate a staged action queue: 1) set next_touch_date, 2) create task, 3) log planning touch note for each contact.",
  "Create a risk-managed queue for stale leads with explicit preview notes and execution order by urgency.",
  "Build a contact recovery run for 20 records: prioritize by oldest touch date and schedule call tasks by tier.",
  "Prepare an AI Ops batch that excludes contacts with missing phone and routes them to data-fix tasks instead.",
  "Draft an execution plan for past clients: check-in tasks + follow-up notes, highest priority first.",
  "Create a weekly pipeline hygiene queue: fill next_touch_date gaps, then create owner follow-up tasks.",
  "Generate a confirmation-first sequence for warm leads with due dates split across next 3 business days.",
  "Build a queue that creates tasks only for contacts with valid phone fields and logs notes for the rest.",
  "Prepare a conversion push run: urgent tasks for hot leads, standard tasks for warm leads, review tasks for cold leads.",
  "Draft an annual-review prep sequence for top contacts including task, note, and next-touch scheduling steps.",
  "Create an AI Ops run to rebalance workload: assign 15 tasks with consistent title format and due-time windows.",
  "Generate a governance-safe action list with clear payload previews and no direct writes until confirmation.",
  "Build a retention-focused run for past clients touched over 45 days ago with soft re-engagement tasks.",
  "Create a high-discipline Monday command batch with explicit ordering and conservative cost estimate metadata.",
];

function fmtUsd(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value || 0);
}

function tomorrowNineAmIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return setMilliseconds(setSeconds(setMinutes(setHours(d, 9), 0), 0), 0).toISOString();
}

function createDraftItems(prompt: string, contacts: ContactWithMeta[]): Array<{
  action_type: AIOpsActionItem["action_type"];
  target_type?: string;
  target_id?: string | null;
  payload_preview: Record<string, unknown>;
  payload_execute: Record<string, unknown>;
}> {
  const p = prompt.toLowerCase();
  const top = contacts.slice(0, 5);
  const out: Array<{
    action_type: AIOpsActionItem["action_type"];
    target_type?: string;
    target_id?: string | null;
    payload_preview: Record<string, unknown>;
    payload_execute: Record<string, unknown>;
  }> = [];

  if (p.includes("follow") || p.includes("task")) {
    for (const c of top) {
      out.push({
        action_type: "create_task",
        target_type: "contact",
        target_id: c.id,
        payload_preview: { contact: getContactDisplayName(c), title: "Follow up call", due: "tomorrow 9:00" },
        payload_execute: {
          contact_id: c.id,
          title: "Follow up call",
          notes: "Created from AI Ops planner",
          due_at: tomorrowNineAmIso(),
        },
      });
    }
  }
  if (p.includes("next touch")) {
    for (const c of top) {
      const date = format(new Date(), "yyyy-MM-dd");
      out.push({
        action_type: "update_contact",
        target_type: "contact",
        target_id: c.id,
        payload_preview: { contact: getContactDisplayName(c), next_touch_date: date },
        payload_execute: { contact_id: c.id, updates: { next_touch_date: date } },
      });
    }
  }
  if (p.includes("log touch") || p.includes("touch note")) {
    for (const c of top.slice(0, 3)) {
      out.push({
        action_type: "log_touch",
        target_type: "contact",
        target_id: c.id,
        payload_preview: { contact: getContactDisplayName(c), type: "note", subject: "AI follow-up touch note" },
        payload_execute: {
          contact_id: c.id,
          type: "note",
          subject: "AI follow-up touch note",
          body: "Auto-drafted by AI Ops.",
          channel: "other",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  if (out.length === 0 && top[0]) {
    out.push({
      action_type: "create_task",
      target_type: "contact",
      target_id: top[0].id,
      payload_preview: { contact: getContactDisplayName(top[0]), title: "Review contact and choose next step" },
      payload_execute: {
        contact_id: top[0].id,
        title: "Review contact and choose next step",
        notes: "No specific keyword detected in prompt. Generated safe default review task.",
        due_at: tomorrowNineAmIso(),
      },
    });
  }
  return out;
}

function groupPackByCategory(entries: ClaudePromptPackEntry[]): Map<string, ClaudePromptPackEntry[]> {
  const m = new Map<string, ClaudePromptPackEntry[]>();
  for (const e of entries) {
    const list = m.get(e.category) ?? [];
    list.push(e);
    m.set(e.category, list);
  }
  return m;
}

export default function AIOps() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [selectedStarterPrompt, setSelectedStarterPrompt] = useState<string>("");
  const [selectedAdvancedPrompt, setSelectedAdvancedPrompt] = useState<string>("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: contacts = [] } = useContacts();
  const { data: runs = [], isLoading: runsLoading } = useAIOpsRuns(30);
  const { data: items = [], isLoading: itemsLoading } = useAIOpsItems(selectedRunId);
  const { summary, rows: usageRows, refetch: refetchUsage } = useAIUsageSummary(30);
  const createDraft = useCreateAIOpsDraftRun();
  const setItemStatus = useSetAIOpsItemStatus();
  const setRunStatus = useSetAIOpsRunStatus();
  const executor = useConfirmAndExecuteAIOpsRun(selectedRunId);
  const [syncingUsage, setSyncingUsage] = useState(false);

  const activeRun = useMemo(() => runs.find((r) => r.id === selectedRunId) ?? null, [runs, selectedRunId]);
  const packByCategory = useMemo(() => groupPackByCategory(CLAUDE_PROMPT_PACK), []);
  const categoryOrder = useMemo(
    () => ["Daily", "Task automation", "Touch logging", "Contact updates", "Workflows", "Manager", "Safety"],
    []
  );

  const insertPackPrompt = useCallback(
    (entry: ClaudePromptPackEntry) => {
      const text = applyClaudePromptPackTemplate(entry.template, user?.id);
      setPrompt((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
      setSelectedStarterPrompt("");
      setSelectedAdvancedPrompt("");
      toast({ title: "Inserted", description: entry.title });
    },
    [toast, user?.id]
  );

  const copyPackPrompt = useCallback(
    async (entry: ClaudePromptPackEntry) => {
      const text = applyClaudePromptPackTemplate(entry.template, user?.id);
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: entry.title });
      } catch {
        toast({ title: "Could not copy", description: "Clipboard access was blocked.", variant: "destructive" });
      }
    },
    [toast, user?.id]
  );

  const handleGenerateDraft = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast({ title: "Enter a prompt", description: "Describe what you want Claude to plan.", variant: "destructive" });
      return;
    }
    const draftItems = createDraftItems(trimmed, contacts);
    const estimated = Math.max(0.004, draftItems.length * 0.002);
    try {
      const { runId } = await createDraft.mutateAsync({
        prompt: trimmed,
        items: draftItems,
        estimated_cost_usd: estimated,
      });
      setSelectedRunId(runId);
      toast({ title: "Draft created", description: `${draftItems.length} action item(s) queued for review.` });
    } catch (error) {
      toast({
        title: "Could not create draft",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const confirmItem = async (itemId: string) => {
    await setItemStatus.mutateAsync({ itemId, status: "confirmed" });
    if (selectedRunId) await setRunStatus.mutateAsync({ runId: selectedRunId, status: "confirmed" });
  };

  const cancelItem = async (itemId: string) => {
    await setItemStatus.mutateAsync({ itemId, status: "cancelled" });
  };

  const runExecution = async () => {
    if (!selectedRunId) return;
    try {
      await executor.execute();
      toast({ title: "Execution finished", description: "AI Ops run completed. Check item statuses below." });
    } catch (error) {
      toast({
        title: "Execution error",
        description: error instanceof Error ? error.message : "Failed to execute run.",
        variant: "destructive",
      });
    }
  };

  const handleSyncUsageNow = async () => {
    try {
      setSyncingUsage(true);
      const endDate = format(new Date(), "yyyy-MM-dd");
      const startDate = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      const { data, error } = await supabase.functions.invoke("sync-anthropic-usage", {
        body: { start_date: startDate, end_date: endDate },
      });
      if (error) throw error;
      await refetchUsage();
      toast({
        title: "Usage sync requested",
        description:
          typeof data === "object" && data && "inserted_events" in (data as Record<string, unknown>)
            ? `Inserted ${String((data as Record<string, unknown>).inserted_events)} usage events.`
            : "Check spend snapshot in a few seconds.",
      });
    } catch (error) {
      toast({
        title: "Usage sync failed",
        description: error instanceof Error ? error.message : "Could not run sync-anthropic-usage.",
        variant: "destructive",
      });
    } finally {
      setSyncingUsage(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Ops"
        description="Claude-assisted planning, approvals, and spend reporting for CRM actions."
      />

      <div className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="zoho-card p-4 border-border xl:col-span-2">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <ClawMascot size={36} />
              <div>
                <h2 className="text-base font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Planner
                </h2>
                <p className="text-xs text-muted-foreground">Draft actions first, then approve line-by-line before execution.</p>
              </div>
            </div>
            <Badge variant="outline">Preview then confirm</Badge>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-ops-prompt">Instruction</Label>
            <Textarea
              id="ai-ops-prompt"
              className="bg-input min-h-[96px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Example: "Create follow-up tasks for warm leads and set next touch this week."'
            />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Library className="w-3.5 h-3.5" />
                Starter prompts
              </Label>
              <Select
                value={selectedStarterPrompt}
                onValueChange={(v) => {
                  setSelectedStarterPrompt(v);
                  setPrompt(v);
                }}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Choose starter prompt..." />
                </SelectTrigger>
                <SelectContent>
                  {STARTER_PROMPTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                Advanced prompts
              </Label>
              <Select
                value={selectedAdvancedPrompt}
                onValueChange={(v) => {
                  setSelectedAdvancedPrompt(v);
                  setPrompt(v);
                }}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Choose advanced prompt..." />
                </SelectTrigger>
                <SelectContent>
                  {ADVANCED_PROMPTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={handleGenerateDraft} disabled={createDraft.isPending}>
              {createDraft.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-1" />}
              Generate draft
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const defaultPrompt = STARTER_PROMPTS[0];
                setSelectedStarterPrompt(defaultPrompt);
                setSelectedAdvancedPrompt("");
                setPrompt(defaultPrompt);
              }}
            >
              Use starter prompt
            </Button>
          </div>
        </Card>

        <Card className="zoho-card p-4 border-border">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <CircleDollarSign className="w-4 h-4 text-primary" />
            Spend snapshot
          </h3>
          <div className="space-y-2">
            <div className="rounded-md border border-border p-2.5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Today</p>
              <p className="text-xl font-bold tabular-nums">{fmtUsd(summary.spendToday)}</p>
            </div>
            <div className="rounded-md border border-border p-2.5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">30 days</p>
              <p className="text-xl font-bold tabular-nums">{fmtUsd(summary.spendPeriod)}</p>
            </div>
            <div className="rounded-md border border-border p-2.5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Tokens (30d)</p>
              <p className="text-base font-semibold tabular-nums">{summary.totalTokens.toLocaleString()}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">Authoritative usage sync from Anthropic billing data.</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-1"
              onClick={handleSyncUsageNow}
              disabled={syncingUsage}
            >
              {syncingUsage ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Test usage sync now
            </Button>
          </div>
        </Card>
        </div>

        <Card className="zoho-card w-full border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Library className="w-4 h-4 text-primary" />
              Claude prompt pack
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
              Tidy presets for external Claude or tool-style commands.{" "}
              <code className="text-[10px] text-foreground/90">{"{{USER_ID}}"}</code> is replaced with your signed-in
              user id; <code className="text-[10px] text-foreground/90">{"{{THIS_FRIDAY}}"}</code> becomes the next
              Friday (<code className="text-[10px]">yyyy-MM-dd</code>). Replace{" "}
              <code className="text-[10px]">CONTACT_ID</code>, <code className="text-[10px]">WORKFLOW_ID</code>, and
              bracketed id lists before running tools.
            </p>
          </div>
        </div>
        <ScrollArea className="mt-4 h-[min(420px,50vh)] pr-3">
          <div className="space-y-5 pb-1">
            {categoryOrder
              .filter((cat) => (packByCategory.get(cat)?.length ?? 0) > 0)
              .map((cat, idx) => {
              const catItems = packByCategory.get(cat)!;
              return (
                <div key={cat} className={idx > 0 ? "border-t border-border/50 pt-5" : ""}>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
                  <ul className="space-y-2.5">
                    {catItems.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-wrap items-start gap-2 gap-y-2 rounded-lg border border-border/80 bg-muted/15 px-3 py-3"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-sm font-medium text-foreground">{entry.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{entry.template}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button type="button" size="sm" variant="secondary" className="h-8 gap-1" onClick={() => insertPackPrompt(entry)}>
                            <FileInput className="w-3.5 h-3.5" />
                            Insert
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => void copyPackPrompt(entry)}>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="zoho-card p-4 border-border xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-primary" />
              Action queue
            </h3>
            <div className="flex items-center gap-2">
              <Select value={selectedRunId ?? ""} onValueChange={(v) => setSelectedRunId(v || null)}>
                <SelectTrigger className="w-[280px] bg-input">
                  <SelectValue placeholder={runsLoading ? "Loading runs..." : "Select a run"} />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((run) => (
                    <SelectItem key={run.id} value={run.id}>
                      {format(new Date(run.created_at), "d MMM HH:mm")} · {run.prompt.slice(0, 50)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={runExecution} disabled={!executor.canExecute}>
                <Play className="w-4 h-4 mr-1" />
                Execute confirmed
              </Button>
            </div>
          </div>

          {itemsLoading ? (
            <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading queue...
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No action items yet. Generate a draft from the planner above.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{item.action_type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{JSON.stringify(item.payload_preview)}</p>
                    </div>
                    <Badge variant={item.status === "failed" ? "destructive" : "outline"} className="capitalize">
                      {item.status}
                    </Badge>
                  </div>
                  {item.error_message ? <p className="text-xs text-destructive mt-1">{item.error_message}</p> : null}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => confirmItem(item.id)} disabled={item.status !== "pending"}>
                      <CheckCheck className="w-3.5 h-3.5 mr-1" />
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => cancelItem(item.id)} disabled={!["pending", "confirmed"].includes(item.status)}>
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="zoho-card p-4 border-border">
          <h3 className="text-sm font-semibold text-foreground mb-2">Model spend (30d)</h3>
          {summary.byModel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage rows yet.</p>
          ) : (
            <ul className="space-y-2">
              {summary.byModel.map((row) => (
                <li key={row.model} className="rounded-md border border-border p-2">
                  <p className="text-sm font-medium">{row.model}</p>
                  <p className="text-xs text-muted-foreground">{fmtUsd(row.spend)} · {row.tokens.toLocaleString()} tokens</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            {usageRows.length} daily usage rows available.
          </p>
          {activeRun ? (
            <div className="mt-3 rounded-md border border-border p-2.5">
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Selected run</p>
              <p className="text-sm mt-1">{activeRun.prompt}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Est {fmtUsd(activeRun.estimated_cost_usd)} · Actual {fmtUsd(activeRun.actual_cost_usd)}
              </p>
            </div>
          ) : null}
        </Card>
        </div>
      </div>
    </div>
  );
}
