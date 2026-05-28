import { Link } from "react-router-dom";
import { Flame, Clock, CalendarOff, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MarketStats } from "@/lib/contactMarkets";

interface MarketCardProps {
  stats: MarketStats;
  className?: string;
}

export function MarketCard({ stats, className }: MarketCardProps) {
  const { market, total, hotLeads, stale, noNextTouch, sampleAddresses } = stats;
  const suburbLine = market.suburbs.join(", ");

  return (
    <Link to={`/contacts?market=${encodeURIComponent(market.id)}`} className={cn("block group", className)}>
      <Card className="h-full border-border/70 bg-card/90 transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-5">
          <div className="flex items-start gap-2 mb-3">
            <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                {market.label}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{suburbLine}</p>
            </div>
          </div>

          <p className="text-3xl font-semibold tabular-nums tracking-tight mb-3">
            {total}
            <span className="text-sm font-normal text-muted-foreground ml-1.5">owners</span>
          </p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {hotLeads > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                <Flame className="h-3 w-3" />
                {hotLeads} hot
              </span>
            )}
            {stale > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                {stale} stale
              </span>
            )}
            {noNextTouch > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <CalendarOff className="h-3 w-3" />
                {noNextTouch} no next touch
              </span>
            )}
            {total > 0 && hotLeads === 0 && stale === 0 && noNextTouch === 0 && (
              <span className="text-[10px] text-muted-foreground">All caught up</span>
            )}
            {total === 0 && (
              <span className="text-[10px] text-muted-foreground">No linked owner properties yet</span>
            )}
          </div>

          {sampleAddresses.length > 0 && (
            <ul className="text-[10px] text-muted-foreground space-y-0.5 border-t border-border/50 pt-2">
              {sampleAddresses.map((addr) => (
                <li key={addr} className="truncate">
                  {addr}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
