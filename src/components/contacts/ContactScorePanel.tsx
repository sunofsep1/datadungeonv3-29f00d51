import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContactScore } from "@/hooks/useContactScore";
import { leadScoreBand, bandColors } from "@/lib/contactScoreQuery";
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
  const colors = bandColors(band);
  const penalty = num(breakdown.inactivity_penalty_points);
  const barPct = Math.min(100, Math.max(0, row.total_score));

  return (
    <Card className="zoho-card p-4 border-border space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Lead score</h3>
        </div>
        <span
          className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border"
          style={{
            background: colors.badgeBg,
            color: colors.badgeText,
            borderColor: colors.badgeBorder,
          }}
        >
          {colors.bandLabel}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums" style={{ color: colors.solidText }}>
          {row.total_score}
        </span>
        <span className="text-xs text-muted-foreground">pts</span>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: colors.solidText }} />
      </div>
      <p className="text-[10px] text-muted-foreground">Cold 0–30 · warm 31–60 · hot 61+</p>

      <div className="border-t border-border/60 pt-3 space-y-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Signals</p>
        <ul className="space-y-1 text-xs">
          {POSITIVE_ROWS.map(({ key, label }) => {
            const v = num(breakdown[key]);
            if (v === 0) return null;
            return (
              <li key={key} className="flex justify-between gap-2 tabular-nums">
                <span className="text-muted-foreground">{label}</span>
                <span className={cn("text-foreground font-medium")}>
                  +{v}
                </span>
              </li>
            );
          })}
          {penalty < 0 && (
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Inactivity penalty</span>
              <span className="font-medium tabular-nums text-amber-400">{penalty}</span>
            </li>
          )}
        </ul>
      </div>

      {row.last_calculated && (
        <p className="text-[10px] text-muted-foreground">
          Updated {formatDistanceToNow(new Date(row.last_calculated), { addSuffix: true })}
        </p>
      )}
    </Card>
  );
}
