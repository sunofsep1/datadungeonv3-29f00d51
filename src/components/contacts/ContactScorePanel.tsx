import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContactScore } from "@/hooks/useContactScore";
import { leadScoreBand } from "@/lib/contactScoreQuery";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const POSITIVE_ROWS: { key: string; label: string }[] = [
  { key: "property_owner_points", label: "Property linked" },
  { key: "sms_response_points", label: "SMS on file" },
  { key: "open_home_attended_points", label: "Open home attended" },
  { key: "appraisal_request_points", label: "Appraisal signals" },
  { key: "past_client_referral_points", label: "Referral source" },
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function bandLabel(band: "hot" | "warm" | "cold"): string {
  if (band === "hot") return "Hot band";
  if (band === "warm") return "Warm band";
  return "Cold band";
}

function bandVariant(band: "hot" | "warm" | "cold"): "default" | "secondary" | "destructive" | "outline" {
  if (band === "hot") return "default";
  if (band === "warm") return "secondary";
  return "outline";
}

export function ContactScorePanel({ contactId }: { contactId: string }) {
  const { data: row, isLoading, isError } = useContactScore(contactId);

  if (isLoading) {
    return (
      <Card className="zoho-card p-4 border-border space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="zoho-card p-4 border-border">
        <p className="text-xs text-muted-foreground">Could not load lead score.</p>
      </Card>
    );
  }

  if (!row) {
    return (
      <Card className="zoho-card p-4 border-border space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Lead score</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          No score row yet. Link a property, log SMS, or wait for the nightly recompute — then totals and breakdown appear here.
        </p>
      </Card>
    );
  }

  const breakdown = (row.score_breakdown && typeof row.score_breakdown === "object"
    ? (row.score_breakdown as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const band = leadScoreBand(row.total_score);
  const penalty = num(breakdown.inactivity_penalty_points);
  const inactiveDays = num(breakdown.inactive_days);
  const penaltyUnits = num(breakdown.inactive_30d_units);

  return (
    <Card className="zoho-card p-4 border-border space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Lead score</h3>
        </div>
        <Badge variant={bandVariant(band)} className="shrink-0 text-[10px]">
          {bandLabel(band)}
        </Badge>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-foreground">{row.total_score}</span>
        <span className="text-xs text-muted-foreground">points</span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Bands: cold &lt;31 · warm 31–60 · hot 61+.{" "}
        {row.last_calculated ? (
          <>
            Updated {formatDistanceToNow(new Date(row.last_calculated), { addSuffix: true })}.
          </>
        ) : null}
      </p>

      <div className="border-t border-border/60 pt-3 space-y-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Breakdown</p>
        <ul className="space-y-1 text-xs">
          {POSITIVE_ROWS.map(({ key, label }) => {
            const v = num(breakdown[key]);
            return (
              <li key={key} className="flex justify-between gap-2 tabular-nums">
                <span className="text-muted-foreground">{label}</span>
                <span className={cn("text-foreground font-medium", v === 0 && "text-muted-foreground font-normal")}>
                  {v > 0 ? `+${v}` : "0"}
                </span>
              </li>
            );
          })}
          <li className="flex justify-between gap-2 tabular-nums">
            <span className="text-muted-foreground">Inactivity (30d periods × rule)</span>
            <span className={cn("font-medium", penalty < 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
              {penalty === 0 ? "0" : penalty}
            </span>
          </li>
        </ul>
        {(inactiveDays > 0 || penaltyUnits > 0) && (
          <p className="text-[10px] text-muted-foreground pt-1">
            {inactiveDays > 0 ? `${inactiveDays} days since last touch/activity` : null}
            {inactiveDays > 0 && penaltyUnits > 0 ? " · " : ""}
            {penaltyUnits > 0 ? `${penaltyUnits} × 30d penalty unit(s)` : null}
          </p>
        )}
      </div>
    </Card>
  );
}
