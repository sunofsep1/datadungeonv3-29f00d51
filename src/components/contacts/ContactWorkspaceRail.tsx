import { useState } from "react";
import { ContactScriptQuickSheet } from "@/components/contacts/ContactScriptQuickSheet";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ChevronDown, FileText, Handshake, ListTodo, Loader2, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { CONTACT_SMART_LISTS } from "@/lib/contactSmartLists";
import { getDaysSinceLastTouch } from "@/lib/contactLastTouch";
import { LEAD_TEMPERATURES, LEAD_TEMPERATURE_LABELS, type LeadTemperature } from "@/lib/leadCategories";
import { openLogTouch } from "@/lib/openLogTouch";
import { useContactScore } from "@/hooks/useContactScore";
import { useContactTasks } from "@/hooks/useContactTasks";
import { leadScoreBand } from "@/lib/contactScoreQuery";
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

export function ContactWorkspaceRail({ contact, contactId }: Props) {
  const [scriptsOpen, setScriptsOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const { data: tasks = [] } = useContactTasks(contactId);
  const { data: scoreRow, isLoading: scoreLoading } = useContactScore(contactId);
  const openTaskCount = tasks.filter((t) => !t.completed_at).length;
  const daysSince = getDaysSinceLastTouch(contact);

  const lastTouch = contact.last_touch_date ? format(new Date(contact.last_touch_date), "d MMM yyyy") : null;
  const nextTouch = contact.next_touch_date ? format(new Date(contact.next_touch_date), "d MMM yyyy") : null;

  const breakdownLines = scoreRow ? formatScoreBreakdownLines(scoreRow.score_breakdown) : [];
  const scoreBand = scoreRow != null ? leadScoreBand(scoreRow.total_score) : null;

  return (
    <Card className="zoho-card p-4 border-border print:hidden space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">Workspace</h3>
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
              <span className="text-2xl font-bold tabular-nums text-foreground">{scoreRow.total_score}</span>
              {scoreBand === "hot" ? (
                <Badge className="text-[10px] bg-red-500/20 text-red-200 border-red-400/35">Hot band</Badge>
              ) : scoreBand === "warm" ? (
                <Badge className="text-[10px] bg-amber-500/15 text-amber-200 border-amber-400/35">Warm band</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Cold band
                </Badge>
              )}
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
