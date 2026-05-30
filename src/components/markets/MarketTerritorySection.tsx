import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarOff, Clock, Flame, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketMapPanel, type PropertyOwnerLink } from "@/components/markets/MarketMapPanel";
import { type MarketStats, type PropertyForMarket } from "@/lib/contactMarkets";
import {
  geocodePropertiesBatch,
  getGeocodeBlockedMessage,
  hasValidCoordinates,
  isGeocodeServiceBlocked,
  propertyNeedsGeocode,
} from "@/lib/propertyGeocode";
import { getGoogleMapsApiKey } from "@/lib/loadGoogleMaps";
import { usePropertyGeocode } from "@/hooks/usePropertyGeocode";
import { cn } from "@/lib/utils";

type MapProperty = PropertyForMarket & { id: string };

type Props = {
  stats: MarketStats;
  properties: MapProperty[];
  ownerLinksByPropertyId: Record<string, PropertyOwnerLink[]>;
  selected?: boolean;
  onSelect?: () => void;
};

function mergeCoords(
  properties: MapProperty[],
  localCoords: Record<string, { lat: number; lng: number }>,
): MapProperty[] {
  return properties.map((p) => {
    const local = localCoords[p.id];
    if (local) return { ...p, latitude: local.lat, longitude: local.lng };
    return p;
  });
}

/** Compact suburb card with stats + embedded map. */
export function MarketSuburbCard({
  stats,
  properties,
  ownerLinksByPropertyId,
  selected = false,
  onSelect,
}: Props) {
  const { market, total, propertyCount, hotLeads, stale, noNextTouch, sampleAddresses } = stats;
  const suburbName = market.suburbs[0] ?? market.label;
  const { saveCoordsBatch } = usePropertyGeocode();
  const [localCoords, setLocalCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [plotting, setPlotting] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(false);

  const displayProperties = useMemo(
    () => mergeCoords(properties, localCoords),
    [properties, localCoords],
  );

  const needsGeocodeCount = useMemo(
    () => displayProperties.filter(propertyNeedsGeocode).length,
    [displayProperties],
  );

  const pinnedCount = useMemo(
    () => displayProperties.filter(hasValidCoordinates).length,
    [displayProperties],
  );

  const plotProperties = useCallback(async () => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      setPlotError("Google Maps API key missing");
      return;
    }
    if (isGeocodeServiceBlocked()) {
      setPlotError(getGeocodeBlockedMessage() ?? "Geocoding unavailable");
      return;
    }

    setPlotting(true);
    setPlotError(null);
    try {
      let coordsAcc = { ...localCoords };
      let totalSaved = 0;
      let emptyRounds = 0;
      const MAX_ROUNDS = 20;
      const pendingSave: Array<{ propertyId: string; lat: number; lng: number }> = [];

      for (let round = 0; round < MAX_ROUNDS; round++) {
        const pending = mergeCoords(properties, coordsAcc).filter(propertyNeedsGeocode);
        if (pending.length === 0) break;

        const { results, blockedStatus } = await geocodePropertiesBatch(pending, apiKey, {
          limit: 50,
          delayMs: 150,
        });
        if (blockedStatus) {
          setPlotError(getGeocodeBlockedMessage() ?? "Geocoding API not enabled on this key");
          break;
        }
        if (results.length === 0) {
          emptyRounds += 1;
          if (emptyRounds >= 3) break;
          await new Promise((r) => setTimeout(r, 1500 * emptyRounds));
          continue;
        }
        emptyRounds = 0;

        for (const row of results) {
          coordsAcc[row.id] = { lat: row.lat, lng: row.lng };
          pendingSave.push({ propertyId: row.id, lat: row.lat, lng: row.lng });
        }
        totalSaved += results.length;
      }

      if (pendingSave.length > 0) {
        await saveCoordsBatch.mutateAsync(pendingSave);
      }

      setLocalCoords(coordsAcc);

      const stillPending = mergeCoords(properties, coordsAcc).filter(propertyNeedsGeocode).length;
      if (stillPending === 0) {
        setPlotError(null);
      } else if (totalSaved === 0) {
        setPlotError("Could not geocode yet — tap Drop pins to retry, or check street addresses.");
      } else {
        setPlotError(null);
      }
    } catch (e: unknown) {
      setPlotError(e instanceof Error ? e.message : "Geocoding failed");
    } finally {
      setPlotting(false);
    }
  }, [properties, localCoords, saveCoordsBatch]);

  // Lazy-load map + geocode when card scrolls into view
  useEffect(() => {
    const el = document.getElementById(`market-${market.id}`);
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [market.id]);

  useEffect(() => {
    if (needsGeocodeCount === 0) setPlotError(null);
  }, [needsGeocodeCount]);

  useEffect(() => {
    if (!mapVisible || needsGeocodeCount === 0 || plotting || isGeocodeServiceBlocked()) return;
    const timer = window.setTimeout(() => void plotProperties(), 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapVisible, market.id]);

  return (
    <Card
      id={`market-${market.id}`}
      className={cn(
        "flex h-full flex-col overflow-hidden border-border/70 bg-card/95 transition-all duration-200 hover:border-primary/35 hover:shadow-md",
        selected && "border-primary ring-1 ring-primary/30 shadow-md",
        onSelect && "cursor-pointer",
      )}
      onClick={onSelect}
    >
      <CardContent className="flex flex-1 flex-col p-0">
        <div className="space-y-3 p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <h3 className={cn("truncate text-sm font-semibold", selected && "text-primary")}>{suburbName}</h3>
                <p className="truncate text-[11px] text-muted-foreground">
                  {market.state ?? "QLD"} · {market.suburbs.join(", ")}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-medium tabular-nums text-primary">
              {pinnedCount} pins
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {total}
              <span className="ml-1 text-xs font-normal text-muted-foreground">owners</span>
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {propertyCount} propert{propertyCount === 1 ? "y" : "ies"}
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {hotLeads > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
                <Flame className="h-3 w-3" />
                {hotLeads} hot
              </span>
            )}
            {stale > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {stale} stale
              </span>
            )}
            {noNextTouch > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <CalendarOff className="h-3 w-3" />
                {noNextTouch} no next
              </span>
            )}
          </div>
        </div>

        {plotError ? (
          <p className="mx-4 mb-2 text-[10px] text-destructive">{plotError}</p>
        ) : null}

        <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
          {mapVisible ? (
            <MarketMapPanel
              market={market}
              properties={displayProperties}
              ownerLinksByPropertyId={ownerLinksByPropertyId}
              needsGeocodeCount={needsGeocodeCount}
              plotting={plotting}
              onPlotAddresses={() => void plotProperties()}
              mapHeightClass="min-h-[220px] sm:min-h-[240px]"
              className="rounded-md"
            />
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
              Map loads when visible…
            </div>
          )}
        </div>

        <div
          className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {sampleAddresses.length > 0 ? (
            <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">{sampleAddresses[0]}</p>
          ) : (
            <span className="text-[10px] text-muted-foreground">CRM territory map</span>
          )}
          <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" asChild>
            <Link to={`/contacts?market=${encodeURIComponent(market.id)}`}>
              <Users className="h-3 w-3 mr-1" />
              Owners
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** @deprecated use MarketSuburbCard */
export const MarketTerritorySection = MarketSuburbCard;
