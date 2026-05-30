import { Link } from "react-router-dom";
import { Flame, Clock, CalendarOff, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MarketStats } from "@/lib/contactMarkets";

interface MarketCardProps {
  stats: MarketStats;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function MarketCard({ stats, selected = false, onSelect, className }: MarketCardProps) {
  const { market, total, propertyCount, hotLeads, stale, noNextTouch, sampleAddresses } = stats;
  const suburbLine = market.suburbs.join(", ");

  return (
    <Card
      className={cn(
        "h-full border-border/70 bg-card/90 transition-all duration-200 hover:border-primary/40 hover:shadow-md",
        selected && "border-primary ring-1 ring-primary/30 shadow-md",
        onSelect && "cursor-pointer hover:-translate-y-0.5",
        className,
      )}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <div className="min-w-0">
            <h3 className={cn("text-sm font-semibold leading-snug", selected && "text-primary")}>{market.label}</h3>
            <p className="text-xs text-muted-foreground truncate">{suburbLine}</p>
          </div>
        </div>

        <div className="flex items-baseline gap-3 mb-3">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {total}
            <span className="text-sm font-normal text-muted-foreground ml-1.5">owners</span>
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {propertyCount} propert{propertyCount === 1 ? "y" : "ies"}
          </p>
        </div>

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
          {total === 0 && propertyCount === 0 && (
            <span className="text-[10px] text-muted-foreground">No properties in this suburb yet</span>
          )}
        </div>

        {sampleAddresses.length > 0 && (
          <ul className="text-[10px] text-muted-foreground space-y-0.5 border-t border-border/50 pt-2 mb-3">
            {sampleAddresses.map((addr) => (
              <li key={addr} className="truncate">
                {addr}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
            <Link to={`/contacts?market=${encodeURIComponent(market.id)}`}>
              <Users className="h-3.5 w-3.5 mr-1" />
              View owners
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
