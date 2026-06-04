import { CalendarOff, Clock, Flame, MapPin } from "lucide-react";
import type { MarketStats } from "@/lib/contactMarkets";
import { getGoogleMapsApiKey } from "@/lib/loadGoogleMaps";
import { cn } from "@/lib/utils";

type Props = {
  stats: MarketStats;
  pinnedCount: number;
  selected: boolean;
  onSelect: () => void;
  /** Slim row without map thumbnail — for full-bleed map layout */
  compact?: boolean;
};

/** Static map thumbnail for unselected suburbs (no Maps JS load). */
function staticMapThumbnail(center: string, zoom = 13): string | null {
  const key = getGoogleMapsApiKey();
  if (!key) return null;
  const params = new URLSearchParams({
    center,
    zoom: String(zoom),
    size: "320x160",
    scale: "2",
    maptype: "roadmap",
    key,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export function MarketSuburbListItem({ stats, pinnedCount, selected, onSelect, compact = false }: Props) {
  const { market, total, propertyCount, hotLeads, stale, noNextTouch } = stats;
  const suburbName = market.suburbs[0] ?? market.label;
  const center = `${suburbName}, ${market.state ?? "QLD"}, Australia`;
  const thumb = compact ? null : staticMapThumbnail(center);

  if (compact) {
    return (
      <button
        type="button"
        id={`market-${market.id}`}
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-border/60 bg-card/80 px-2.5 py-2 text-left transition-colors hover:border-primary/35",
          selected && "border-primary bg-primary/5 ring-1 ring-primary/25",
        )}
      >
        <MapPin className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-xs font-semibold", selected && "text-primary")}>{suburbName}</p>
          <p className="truncate text-[10px] text-muted-foreground tabular-nums">
            {total} owners · {pinnedCount} pins
          </p>
        </div>
        {hotLeads > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] text-amber-200">
            <Flame className="h-2.5 w-2.5" />
            {hotLeads}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      id={`market-${market.id}`}
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border border-border/70 bg-card/95 text-left transition-all hover:border-primary/35 hover:shadow-sm",
        selected && "border-primary ring-1 ring-primary/30 shadow-md",
      )}
    >
      {thumb ? (
        <div className="relative h-20 w-full overflow-hidden rounded-t-lg bg-muted">
          <img src={thumb} alt="" className="h-full w-full object-cover opacity-90" loading="lazy" />
          <span className="absolute bottom-1.5 right-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] tabular-nums text-primary">
            {pinnedCount} pins
          </span>
        </div>
      ) : null}

      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className={cn("truncate text-sm font-semibold", selected && "text-primary")}>{suburbName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{market.state ?? "QLD"}</p>
            </div>
          </div>
          {!thumb ? (
            <span className="shrink-0 text-[10px] tabular-nums text-primary">{pinnedCount} pins</span>
          ) : null}
        </div>

        <p className="text-lg font-semibold tabular-nums leading-none">
          {total}
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">owners · {propertyCount} props</span>
        </p>

        <div className="flex flex-wrap gap-1">
          {hotLeads > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-200">
              <Flame className="h-2.5 w-2.5" />
              {hotLeads}
            </span>
          )}
          {stale > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {stale}
            </span>
          )}
          {noNextTouch > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
              <CalendarOff className="h-2.5 w-2.5" />
              {noNextTouch}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
