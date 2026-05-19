import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListings } from "@/hooks/useListings";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import {
  buildListingPipelineFunnel,
  formatFunnelAud,
  type ListingFunnelRow,
} from "@/lib/listingPipelineFunnel";
import { cn } from "@/lib/utils";

const STAGE_BAR_COLORS = [
  "bg-sky-500",
  "bg-primary",
  "bg-amber-500",
  "bg-orange-500",
  "bg-emerald-500",
];

export function PipelineSummary() {
  const { data: listings = [], isLoading } = useListings();
  const { commissionRate } = useCommissionRate();
  const navigate = useNavigate();

  const funnel = useMemo(
    () => buildListingPipelineFunnel(listings, commissionRate),
    [listings, commissionRate],
  );

  const maxCount = useMemo(
    () => Math.max(1, ...funnel.rows.map((r) => r.count)),
    [funnel.rows],
  );

  if (isLoading) {
    return (
      <Card className="zoho-card p-3">
        <Skeleton className="h-4 w-36 mb-3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="zoho-card p-3">
      <PipelineFunnelHeader navigate={navigate} commissionRate={commissionRate} />

      {funnel.totals.count === 0 ? (
        <EmptyPipeline onOpenListings={() => navigate("/listings")} />
      ) : (
        <>
          <FunnelTotals totals={funnel.totals} />
          <div className="space-y-2.5">
            {funnel.rows.map((row, i) => (
              <FunnelStageRow
                key={row.stageId}
                row={row}
                maxCount={maxCount}
                colorClass={STAGE_BAR_COLORS[i] ?? "bg-primary"}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function PipelineFunnelHeader({
  navigate,
  commissionRate,
}: {
  navigate: ReturnType<typeof useNavigate>;
  commissionRate: number;
}) {
  return (
    <div className="flex items-center justify-between mb-2 gap-2">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
          Current pipeline
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Count · value · projected GCI at {commissionRate}% commission
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 text-xs text-muted-foreground hover:text-foreground -mr-1"
        onClick={() => navigate("/listings")}
      >
        Board <ChevronRight className="w-4 h-4 ml-0.5" />
      </Button>
    </div>
  );
}

function EmptyPipeline({ onOpenListings }: { onOpenListings: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg border border-dashed border-border/80">
      <p className="text-sm text-muted-foreground text-center">No active listings in the pipeline yet.</p>
      <Button size="sm" variant="outline" className="border-border/80" onClick={onOpenListings}>
        Go to listings
      </Button>
    </div>
  );
}

function FunnelTotals({
  totals,
}: {
  totals: { count: number; totalValue: number; projectedGci: number };
}) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-3 rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Listings</p>
        <p className="text-sm font-bold tabular-nums">{totals.count}</p>
      </div>
      <FunnelTotalCell label="Value" value={formatFunnelAud(totals.totalValue)} />
      <FunnelTotalCell label="GCI" value={formatFunnelAud(totals.projectedGci)} emphasize />
    </div>
  );
}

function FunnelTotalCell({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-bold tabular-nums truncate", emphasize && "text-primary")}>{value}</p>
    </div>
  );
}

function FunnelStageRow({
  row,
  maxCount,
  colorClass,
}: {
  row: ListingFunnelRow;
  maxCount: number;
  colorClass: string;
}) {
  const pct = (row.count / maxCount) * 100;
  const barWidth = row.count > 0 ? Math.max(pct, 8) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-sm text-foreground truncate">{row.label}</span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{row.count}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <StageBarFill widthPct={barWidth} colorClass={colorClass} />
      </div>
      <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground tabular-nums">
        <span>{formatFunnelAud(row.totalValue)}</span>
        <span className="text-primary/90">{formatFunnelAud(row.projectedGci)} GCI</span>
      </div>
    </div>
  );
}

function StageBarFill({ widthPct, colorClass }: { widthPct: number; colorClass: string }) {
  return (
    <div
      className={cn("h-full rounded-full transition-all", colorClass)}
      style={{ width: `${widthPct}%` }}
    />
  );
}
