import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronRight, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildListingPipelineFunnel,
  formatFunnelAud,
  type ListingFunnelRow,
  type ListingPipelineFunnelResult,
} from "@/lib/listingPipelineFunnel";
import type { ListingPriceSource } from "@/lib/listingPriceFields";
import { cn } from "@/lib/utils";

const STAGE_BAR_COLORS = [
  "bg-sky-500",
  "bg-primary",
  "bg-amber-500",
  "bg-orange-500",
  "bg-emerald-500",
];

type Props = {
  listings: (ListingPriceSource & { pipeline_stage?: string | null })[];
  commissionRate: number;
  isLoading?: boolean;
  /** Dashboard uses compact header; Reports uses full with table link */
  variant?: "dashboard" | "reports";
  className?: string;
};

export function ListingPipelineFunnelCard({
  listings,
  commissionRate,
  isLoading,
  variant = "dashboard",
  className,
}: Props) {
  const navigate = useNavigate();
  const funnel = useMemo(
    () => buildListingPipelineFunnel(listings, commissionRate),
    [listings, commissionRate],
  );
  const maxCount = useMemo(() => Math.max(1, ...funnel.rows.map((r) => r.count)), [funnel.rows]);

  if (isLoading) {
    return (
      <Card className={cn("zoho-card p-3 border-border", className)}>
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
    <Card className={cn("zoho-card border-border", variant === "reports" ? "p-4" : "p-3", className)}>
      <FunnelHeader
        variant={variant}
        commissionRate={commissionRate}
        onOpenBoard={() => navigate("/listings")}
      />
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
          {variant === "reports" ? (
            <FunnelStageTable funnel={funnel} commissionRate={commissionRate} />
          ) : null}
        </>
      )}
    </Card>
  );
}

function FunnelHeader({
  variant,
  commissionRate,
  onOpenBoard,
}: {
  variant: "dashboard" | "reports";
  commissionRate: number;
  onOpenBoard: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-2 gap-2">
      <div className="min-w-0">
        <h3
          className={cn(
            "font-semibold text-foreground flex items-center gap-1.5",
            variant === "reports" ? "text-sm" : "text-base",
          )}
        >
          <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
          {variant === "reports" ? "Pipeline value & GCI" : "Current pipeline"}
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Count · search price value · projected OCI at {commissionRate}% commission
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 text-xs text-muted-foreground hover:text-foreground -mr-1"
        onClick={onOpenBoard}
      >
        Board
        <ChevronRight className="w-4 h-4 ml-0.5" />
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
  totals: ListingPipelineFunnelResult["totals"];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-3 rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Listings</p>
        <p className="text-sm font-bold tabular-nums">{totals.count}</p>
      </div>
      <FunnelTotalCell label="Value" value={formatFunnelAud(totals.totalValue)} />
      <FunnelTotalCell label="OCI" value={formatFunnelAud(totals.projectedGci)} emphasize />
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
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground tabular-nums">
        <span>{formatFunnelAud(row.totalValue)}</span>
        <span className="text-primary/90">{formatFunnelAud(row.projectedGci)} OCI</span>
      </div>
    </div>
  );
}

function FunnelStageTable({
  funnel,
  commissionRate,
}: {
  funnel: ListingPipelineFunnelResult;
  commissionRate: number;
}) {
  return (
    <div className="mt-4 overflow-x-auto -mx-1 border-t border-border pt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {["Stage", "Count", "Value", "Projected OCI"].map((h) => (
              <th
                key={h}
                className="pb-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {funnel.rows.map((row) => (
            <tr key={row.stageId} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-4">{row.label}</td>
              <td className="py-2 pr-4 tabular-nums">{row.count}</td>
              <td className="py-2 pr-4 tabular-nums">{formatFunnelAud(row.totalValue)}</td>
              <td className="py-2 pr-4 tabular-nums text-primary">{formatFunnelAud(row.projectedGci)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2 pr-4">Total</td>
            <td className="py-2 pr-4 tabular-nums">{funnel.totals.count}</td>
            <td className="py-2 pr-4 tabular-nums">{formatFunnelAud(funnel.totals.totalValue)}</td>
            <td className="py-2 pr-4 tabular-nums text-primary">
              {formatFunnelAud(funnel.totals.projectedGci)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">
        GCI uses search price × {commissionRate}% —{" "}
        <Link to="/settings/business#commission-rate" className="text-primary hover:underline">
          set your rate in Settings
        </Link>
        .
      </p>
    </div>
  );
}
