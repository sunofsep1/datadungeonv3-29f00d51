import { Loader2, TrendingUp } from "lucide-react";
import { usePricefinderSuburbStats } from "@/hooks/usePricefinderEnrich";
import type { ContactMarket } from "@/lib/contactMarkets";
import { cn } from "@/lib/utils";

function formatAud(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
  return `$${Math.round(value / 1000)}k`;
}

type Props = {
  market: ContactMarket;
  className?: string;
};

export function MarketSuburbStats({ market, className }: Props) {
  const suburb = market.suburbs[0] ?? market.label;
  const { data, isLoading, isError, error } = usePricefinderSuburbStats(suburb, market.state ?? "QLD");

  return (
    <div className={cn("flex flex-wrap items-center gap-3 border-b border-border/60 bg-muted/20 px-3 py-2", className)}>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        Pricefinder · {suburb}
      </span>

      {isLoading ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading suburb sample…
        </span>
      ) : null}

      {isError ? (
        <span className="text-[11px] text-muted-foreground">
          {(error as Error)?.message?.includes("not configured")
            ? "Connect Pricefinder in Supabase secrets"
            : "Suburb stats unavailable"}
        </span>
      ) : null}

      {data ? (
        <>
          <Stat label="Median sale" value={formatAud(data.median_last_sale_price)} />
          <Stat label="Sales in sample" value={String(data.recent_sales_count)} />
          <Stat label="Sample size" value={String(data.sample_size)} />
          {data.note ? <span className="text-[10px] text-muted-foreground">{data.note}</span> : null}
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[11px] text-muted-foreground">
      {label}: <span className="font-medium tabular-nums text-foreground">{value}</span>
    </span>
  );
}
