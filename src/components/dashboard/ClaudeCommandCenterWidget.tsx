import { Link } from "react-router-dom";
import { Bot, ChevronRight, DollarSign, Loader2, ShieldCheck, TimerReset } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClawMascot } from "@/components/brand/ClawMascot";
import { useAIOpsPendingItemsCount } from "@/hooks/useAIActions";
import { useAIUsageSummary } from "@/hooks/useAIUsage";

function fmtUsd(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function ClaudeCommandCenterWidget() {
  const { data: pending = 0, isLoading: pendingLoading } = useAIOpsPendingItemsCount();
  const { summary, isLoading: usageLoading } = useAIUsageSummary(7);

  return (
    <Card className="zoho-card p-4 border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ClawMascot size={34} />
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-primary" />
              Claude Command Center
            </h3>
            <p className="text-xs text-muted-foreground">Preview, confirm, and execute AI actions safely.</p>
          </div>
        </div>
        <Badge variant="outline">Strict confirm mode</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg border border-border p-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Pending approvals</p>
          {pendingLoading ? (
            <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading
            </p>
          ) : (
            <p className="text-xl font-bold tabular-nums mt-1">{pending}</p>
          )}
        </div>
        <div className="rounded-lg border border-border p-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Spend today</p>
          {usageLoading ? <p className="text-sm text-muted-foreground mt-1">Loading</p> : <p className="text-xl font-bold mt-1">{fmtUsd(summary.spendToday)}</p>}
        </div>
        <div className="rounded-lg border border-border p-2.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">7d spend</p>
          {usageLoading ? <p className="text-sm text-muted-foreground mt-1">Loading</p> : <p className="text-xl font-bold mt-1">{fmtUsd(summary.spendPeriod)}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link to="/ai-ops" className="gap-1.5">
            Open AI Ops <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/ai-ops" className="gap-1.5">
            <TimerReset className="w-3.5 h-3.5" />
            Review queue
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/ai-ops" className="gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Spend report
          </Link>
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        Writes execute only after explicit confirmation.
      </p>
    </Card>
  );
}
