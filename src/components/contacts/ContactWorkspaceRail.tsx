import { useState } from "react";
import { ContactScriptQuickSheet } from "@/components/contacts/ContactScriptQuickSheet";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ChevronDown, ClipboardList, FileText, GitBranch, Handshake, ListTodo, Loader2, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { CONTACT_SMART_LISTS } from "@/lib/contactSmartLists";
import { getDaysSinceLastTouch } from "@/lib/contactLastTouch";
import { LEAD_TEMPERATURES, LEAD_TEMPERATURE_LABELS, type LeadTemperature } from "@/lib/leadCategories";
import { openLogTouch } from "@/lib/openLogTouch";
import { useContactScore } from "@/hooks/useContactScore";
import { useContactTasks } from "@/hooks/useContactTasks";
import {
  useCrmWorkflowEnrollmentsForContact,
  useCrmWorkflowsList,
  useStartCrmWorkflowEnrollment,
} from "@/hooks/useCrmWorkflows";
import { useToast } from "@/hooks/use-toast";
import { useAnnualReviewContactStatusMap } from "@/hooks/useAnnualReviews";
import { leadScoreBand, bandColors } from "@/lib/contactScoreQuery";
import { cn } from "@/lib/utils";
import type { Json, Tables } from "@/integrations/supabase/types";

type ContactRow = Tables<"contacts">;

function classificationLabel(category: string | null | undefined): string {
  const raw = String(category ?? "").trim();
  if (!raw) return "Not set";
  const row = CONTACT_SMART_LISTS.find((s) => s.id === raw);
  if (row) return row.label;
  return raw.replace(/_/g, " ");
}

function leadTemperatureDisplay(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  if ((LEAD_TEMPERATURES as readonly string[]).includes(raw)) {
    return LEAD_TEMPERATURE_LABELS[raw as LeadTemperature];
  }
  return raw.replace(/_/g, " ");
}

const BREAKDOWN_ROWS: { key: string; label: string; kind: "points" | "count" }[] = [
  { key: "property_owner_points", label: "Property link", kind: "points" },
  { key: "sms_response_points", label: "SMS engagement", kind: "points" },
  { key: "open_home_attended_points", label: "Open home", kind: "points" },
  { key: "appraisal_request_points", label: "Appraisal signals", kind: "points" },
  { key: "past_client_referral_points", label: "Referral source", kind: "points" },
  { key: "inactive_days", label: "Days since activity", kind: "count" },
  { key: "inactive_30d_units", label: "Inactivity (30d units)", kind: "count" },
  { key: "inactivity_penalty_points", label: "Inactivity penalty", kind: "points" },
];

function formatScoreBreakdownLines(breakdown: Json): { label: string; text: string }[] {
  if (breakdown === null || typeof breakdown !== "object" || Array.isArray(breakdown)) return [];
  const o = breakdown as Record<string, unknown>;
  const out: { label: string; text: string }[] = [];
  for (const row of BREAKDOWN_ROWS) {
    const v = o[row.key];
    if (typeof v !== "number") continue;
    if (row.kind === "points") {
      out.push({
        label: row.label,
        text: v === 0 ? "0" : v > 0 ? `+${v}` : String(v),
      });
    } else {
      out.push({ label: row.label, text: String(v) });
    }
  }
  return out;
}

type Props = {
  contact: ContactRow;
  contactId: string;
};

function humanizeAnnualReviewStatus(raw: string): string {
  return raw
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

export function ContactWorkspaceRail({ contact, contactId }: Props) {
  const { toast } = useToast();
  const [scriptsOpen, setScriptsOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [workflowPick, setWorkflowPick] = useState<string>("");
  const { data: tasks = [] } = useContactTasks(contactId);
  const { data: scoreRow, isLoading: scoreLoading } = useContactScore(contactId);
  const { data: crmEnrollments = [] } = useCrmWorkflowEnrollmentsForContact(contactId);
  const { data: crmWorkflows = [] } = useCrmWorkflowsList();
  const startEnrollment = useStartCrmWorkflowEnrollment();
  const reviewYear = new Date().getFullYear();
  const { data: reviewStatusByContact = new Map<string, string>() } = useAnnualReviewContactStatusMap(reviewYear);
  const annualReviewStatus = reviewStatusByContact.get(contactId);
  const openTaskCount = tasks.filter((t) => !t.completed_at).length;
  const daysSince = getDaysSinceLastTouch(contact);

  const lastTouch = contact.last_touch_date ? format(new Date(contact.last_touch_date), "d MMM yyyy") : null;
  const nextTouch = contact.next_touch_date ? format(new Date(contact.next_touch_date), "d MMM yyyy") : null;

  const breakdownLines = scoreRow ? formatScoreBreakdownLines(scoreRow.score_breakdown) : [];
  const scoreBand = scoreRow != null ? leadScoreBand(scoreRow.total_score) : null;

  const activeCrmIds = new Set(crmEnrollments.filter((e) => e.status === "active").map((e) => e.workflow_id));
  const manualContactWorkflows = crmWorkflows.filter(
    (w) => w.is_active && w.trigger_object === "contact" && w.trigger_type === "manual"
  );
  const nextOpenTask = tasks.find((t) => !t.completed_at);

  const handleEnrollWorkflow = () => {
    if (!workflowPick) {
      toast({ title: "Choose a workflow", variant: "destructive" });
      return;
    }
    startEnrollment.mutate(
      { workflowId: workflowPick, contactId },
      {
        onSuccess: () => {
          toast({ title: "Enrolled", description: "This contact is now in the workflow queue." });
          setWorkflowPick("");
        },
        onError: (e) =>
          toast({
            title: "Could not enroll",
            description: e instanceof Error ? e.message : "Try again.",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <Card className="zoho-card p-3 sm:p-4 border-border print:hidden space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</h3>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Playbook</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="font-normal text-xs">
            {classificationLabel(contact.contact_category)}
          </Badge>
          <Badge variant="outline" className="font-normal text-xs">
            {leadTemperatureDisplay(contact.lead_temperature)}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" />
          Lead score
        </p>
        {scoreLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : scoreRow ? (
          <>
            <div className="flex flex-wrap items-baseline gap-2">
              {(() => {
                const c = bandColors(scoreBand ?? "cold");
                return (
                  <span className="text-2xl font-bold tabular-nums" style={{ color: c.solidText }}>
                    {scoreRow.total_score}
                  </span>
                );
              })()}
              {scoreBand &&
                (() => {
                  const c = bandColors(scoreBand);
                  return (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{ background: c.badgeBg, color: c.badgeText, borderColor: c.badgeBorder }}
                    >
                      {c.bandLabel}
                    </span>
                  );
                })()}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Updated {format(new Date(scoreRow.last_calculated), "d MMM yyyy, h:mm a")}
            </p>
            {breakdownLines.length > 0 ? (
              <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 mr-1 transition-transform", breakdownOpen && "rotate-180")}
                    />
                    Score breakdown
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-1 space-y-1 text-xs border border-border/60 rounded-md p-2 bg-muted/20">
                    {breakdownLines.map((row) => (
                      <li key={row.label} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="tabular-nums text-foreground font-medium">{row.text}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            No score calculated yet for this contact. It appears after lead scoring runs (workflows or scheduled recompute).
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-1.5 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Touch rhythm</p>
        <p className="text-foreground">
          <span className="text-muted-foreground">Last touch:</span> {lastTouch ?? "—"}
        </p>
        <p className="text-foreground">
          <span className="text-muted-foreground">Next touch:</span> {nextTouch ?? "—"}
        </p>
        {daysSince != null ? (
          <p className="text-xs text-muted-foreground">{daysSince} days since last touch</p>
        ) : null}
      </div>

      <Separator />

      <div className="space-y-1.5 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <ClipboardList className="h-3 w-3" />
          Annual review ({reviewYear})
        </p>
        {annualReviewStatus ? (
          <p className="text-sm text-foreground">{humanizeAnnualReviewStatus(annualReviewStatus)}</p>
        ) : (
          <p className="text-xs text-muted-foreground">No review record for this calendar year.</p>
        )}
        <Button variant="link" className="h-auto p-0 text-xs" asChild>
          <Link to="/annual-reviews">Annual reviews hub</Link>
        </Button>
      </div>

      <Separator />

      {nextOpenTask ? (
        <>
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Recommended next</p>
            <p className="text-sm text-foreground font-medium leading-snug">{nextOpenTask.title}</p>
            {nextOpenTask.due_at ? (
              <p className="text-xs text-muted-foreground">Due {format(new Date(nextOpenTask.due_at), "d MMM yyyy")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">No due date</p>
            )}
          </div>
          <Separator />
        </>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <GitBranch className="h-3 w-3" />
            CRM workflows
          </p>
          <Button variant="link" className="h-auto p-0 text-[11px]" asChild>
            <Link to="/automations">Directory</Link>
          </Button>
        </div>
        {crmEnrollments.filter((e) => e.status === "active").length > 0 ? (
          <ul className="space-y-1.5 text-xs">
            {crmEnrollments
              .filter((e) => e.status === "active")
              .slice(0, 5)
              .map((e) => (
                <li key={e.id} className="flex justify-between gap-2 text-foreground">
                  <span className="truncate font-medium">{e.workflow_name ?? "Workflow"}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                    step {e.current_step_order}
                  </Badge>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No active CRM workflow enrollments.</p>
        )}
        {manualContactWorkflows.length > 0 ? (
          <div className="flex flex-col gap-2 pt-1">
            <Select value={workflowPick || undefined} onValueChange={setWorkflowPick}>
              <SelectTrigger className="h-9 bg-background text-xs">
                <SelectValue placeholder="Add to workflow…" />
              </SelectTrigger>
              <SelectContent>
                {manualContactWorkflows.map((w) => (
                  <SelectItem key={w.id} value={w.id} disabled={activeCrmIds.has(w.id)}>
                    {w.name}
                    {activeCrmIds.has(w.id) ? " (active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              disabled={!workflowPick || startEnrollment.isPending}
              onClick={handleEnrollWorkflow}
            >
              {startEnrollment.isPending ? "Enrolling…" : "Enroll"}
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground pt-1">
            No manual contact workflows yet.{" "}
            <Link to="/automations" className="text-primary underline-offset-2 hover:underline">
              Automations
            </Link>
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quick actions</p>
        <div className="flex flex-col gap-1.5">
          <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => openLogTouch({ contactId })}>
            <Handshake className="h-3.5 w-3.5" />
            Log touch
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-9"
            onClick={() => setScriptsOpen(true)}
          >
            <FileText className="h-3.5 w-3.5" />
            Scripts
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-full px-3" asChild>
            <Link to="/tasks" className="inline-flex w-full items-center gap-2">
              <ListTodo className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left">All tasks</span>
              {openTaskCount > 0 ? (
                <Badge variant="secondary" className="tabular-nums text-[10px] shrink-0">
                  {openTaskCount}
                </Badge>
              ) : null}
            </Link>
          </Button>
        </div>
        {openTaskCount > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {openTaskCount} open task{openTaskCount !== 1 ? "s" : ""} on this contact (complete from Tasks or the timeline).
          </p>
        ) : null}
      </div>

      <ContactScriptQuickSheet
        open={scriptsOpen}
        onOpenChange={setScriptsOpen}
        contactCategory={contact.contact_category}
      />
    </Card>
  );
}
