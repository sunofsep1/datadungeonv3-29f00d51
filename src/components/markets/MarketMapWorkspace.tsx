import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Crosshair, List, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarketMapPanel, type PropertyOwnerLink } from "@/components/markets/MarketMapPanel";
import { MapProspectPickBar } from "@/components/markets/MapProspectPickBar";
import { MarketPropertyList } from "@/components/markets/MarketPropertyList";
import { MarketStreetViewPanel } from "@/components/markets/MarketStreetViewPanel";
import { MarketSuburbStats } from "@/components/markets/MarketSuburbStats";
import { ProspectFromMapDialog, type ProspectMapSeed } from "@/components/markets/ProspectFromMapDialog";
import { PropertyReportUploadDialog } from "@/components/pricefinder/PropertyReportUploadDialog";
import { PricefinderResearchPanel } from "@/components/pricefinder/PricefinderResearchPanel";
import { usePricefinderMode } from "@/hooks/usePricefinderMode";
import { usePropertyGeocode } from "@/hooks/usePropertyGeocode";
import type { MarketStats, PropertyForMarket, PropertyPinUrgency } from "@/lib/contactMarkets";
import { listingIdFromMapPropertyId, type PropertyListingPinMeta } from "@/lib/marketListingPins";
import { getGoogleMapsApiKey } from "@/lib/loadGoogleMaps";
import {
  formatPropertyGeocodeAddress,
  geocodePropertiesBatch,
  getGeocodeBlockedMessage,
  hasValidCoordinates,
  isGeocodeServiceBlocked,
  propertyNeedsGeocode,
  reverseGeocodeLatLng,
} from "@/lib/propertyGeocode";
import { mapPickToProspectSeed, type MapProspectPick } from "@/lib/mapProspectPick";
import type { PricefinderPropertyData } from "@/lib/pricefinderTypes";
import { formatPropertyAddress, type Property } from "@/hooks/useProperties";
import { intelFromPropertyReport } from "@/lib/propertyReportIntel";
import { cn } from "@/lib/utils";

type MapProperty = PropertyForMarket & {
  id: string;
  property_report?: Record<string, unknown> | null;
};

type Props = {
  stats: MarketStats;
  properties: MapProperty[];
  ownerLinksByPropertyId: Record<string, PropertyOwnerLink[]>;
  propertyUrgencyById: Record<string, PropertyPinUrgency>;
  propertyListingPinById: Record<string, PropertyListingPinMeta>;
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

export function MarketMapWorkspace({
  stats,
  properties,
  ownerLinksByPropertyId,
  propertyUrgencyById,
  propertyListingPinById,
}: Props) {
  const { market } = stats;
  const suburbName = market.suburbs[0] ?? market.label;
  const { mode } = usePricefinderMode();
  const { saveCoordsBatch, saveCoords } = usePropertyGeocode();
  const queryClient = useQueryClient();

  const [localCoords, setLocalCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [plotting, setPlotting] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [importPropertyId, setImportPropertyId] = useState<string | null>(null);
  const [prospectDialogOpen, setProspectDialogOpen] = useState(false);
  const [prospectSeed, setProspectSeed] = useState<ProspectMapSeed | null>(null);
  const [pinDropMode, setPinDropMode] = useState(false);
  const [draftPick, setDraftPick] = useState<MapProspectPick | null>(null);
  const resolvePickRequestRef = useRef(0);
  const [propertyListOpen, setPropertyListOpen] = useState(false);
  const [pfToolsOpen, setPfToolsOpen] = useState(false);
  const [streetView, setStreetView] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  const displayProperties = useMemo(
    () => mergeCoords(properties, localCoords),
    [properties, localCoords],
  );

  const pfByPropertyId = useMemo(() => {
    const map: Record<string, PricefinderPropertyData> = {};
    for (const p of displayProperties) {
      const intel = intelFromPropertyReport(p.property_report as Record<string, unknown> | null);
      if (intel) map[p.id] = intel;
    }
    return map;
  }, [displayProperties]);

  const needsGeocodeCount = useMemo(
    () => displayProperties.filter(propertyNeedsGeocode).length,
    [displayProperties],
  );

  const pinnedCount = useMemo(
    () => displayProperties.filter(hasValidCoordinates).length,
    [displayProperties],
  );

  const importProperty = useMemo(
    () => displayProperties.find((p) => p.id === importPropertyId) ?? null,
    [displayProperties, importPropertyId],
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
      const pendingSave: Array<{ propertyId: string; lat: number; lng: number }> = [];

      for (let round = 0; round < 20; round++) {
        const pending = mergeCoords(properties, coordsAcc).filter(propertyNeedsGeocode);
        if (pending.length === 0) break;

        const { results, blockedStatus } = await geocodePropertiesBatch(pending, apiKey, {
          limit: 50,
          delayMs: 150,
        });
        if (blockedStatus) {
          setPlotError(getGeocodeBlockedMessage() ?? "Geocoding API not enabled");
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
          if (!listingIdFromMapPropertyId(row.id)) {
            pendingSave.push({ propertyId: row.id, lat: row.lat, lng: row.lng });
          }
        }
        totalSaved += results.length;
      }

      if (pendingSave.length > 0) await saveCoordsBatch.mutateAsync(pendingSave);
      setLocalCoords(coordsAcc);

      const stillPending = mergeCoords(properties, coordsAcc).filter(propertyNeedsGeocode).length;
      if (stillPending === 0) setPlotError(null);
      else if (totalSaved === 0) setPlotError("Could not geocode — check addresses or retry Drop pins.");
    } catch (e: unknown) {
      setPlotError(e instanceof Error ? e.message : "Geocoding failed");
    } finally {
      setPlotting(false);
    }
  }, [properties, localCoords, saveCoordsBatch]);

  useEffect(() => {
    setSelectedPropertyId(null);
    setStreetView(null);
    setLocalCoords({});
    setPropertyListOpen(false);
    setProspectDialogOpen(false);
    setProspectSeed(null);
    setPinDropMode(false);
    setDraftPick(null);
  }, [market.id]);

  const resolveDraftPick = useCallback((pick: MapProspectPick) => {
    setDraftPick(pick);
    setPinDropMode(true);
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      setDraftPick({ ...pick, resolving: false });
      return;
    }
    const requestId = ++resolvePickRequestRef.current;
    void reverseGeocodeLatLng(pick.lat, pick.lng, apiKey).then((outcome) => {
      if (requestId !== resolvePickRequestRef.current) return;
      if (outcome.ok) {
        setDraftPick({
          lat: outcome.lat,
          lng: outcome.lng,
          addressParts: outcome.addressParts,
          addressLine: outcome.formattedAddress,
          resolving: false,
        });
      } else {
        setDraftPick((prev) => (prev ? { ...prev, resolving: false } : null));
      }
    });
  }, []);

  const handleConfirmDraftPick = useCallback(() => {
    if (!draftPick) return;
    setProspectSeed(mapPickToProspectSeed(draftPick));
    setProspectDialogOpen(true);
    setDraftPick(null);
    setPinDropMode(false);
  }, [draftPick]);

  const handleCancelDraftPick = useCallback(() => {
    resolvePickRequestRef.current += 1;
    setDraftPick(null);
    setPinDropMode(false);
  }, []);

  const handleProspectPinMoved = useCallback(
    async (propertyId: string, lat: number, lng: number) => {
      setLocalCoords((prev) => ({ ...prev, [propertyId]: { lat, lng } }));
      try {
        await saveCoords.mutateAsync({ propertyId, lat, lng });
      } catch {
        // optimistic pin already moved — user can retry from property record
      }
    },
    [saveCoords],
  );

  const handleProspectingComplete = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["properties"] });
    void queryClient.invalidateQueries({ queryKey: ["contacts"] });
  }, [queryClient]);

  const handlePropertyCreated = useCallback(
    (propertyId: string, coords?: { lat: number; lng: number }) => {
      setSelectedPropertyId(propertyId);
      if (coords) {
        setLocalCoords((prev) => ({ ...prev, [propertyId]: coords }));
      }
      handleProspectingComplete();
    },
    [handleProspectingComplete],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/50 px-2 py-1.5 sm:px-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold leading-tight">{suburbName}</h2>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {pinnedCount} pinned · {stats.total} owners · {stats.propertyCount} props
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant={pinDropMode ? "default" : "outline"}
            size="sm"
            className={cn("h-7 px-2 text-xs", pinDropMode && "ring-2 ring-primary/40")}
            onClick={() => {
              setPinDropMode((v) => {
                const next = !v;
                if (!next) setDraftPick(null);
                return next;
              });
            }}
          >
            <Crosshair className="h-3.5 w-3.5 mr-1" />
            Drop pin
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setProspectSeed(null);
              setProspectDialogOpen(true);
            }}
          >
            <MapPin className="h-3.5 w-3.5 mr-1" />
            Search address
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setPropertyListOpen((v) => !v)}
          >
            <List className="h-3.5 w-3.5 mr-1" />
            List
          </Button>
          <Collapsible open={pfToolsOpen} onOpenChange={setPfToolsOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                Pricefinder
                {pfToolsOpen ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link to={`/contacts?market=${encodeURIComponent(market.id)}`}>
              <Users className="h-3.5 w-3.5 mr-1" />
              Owners
            </Link>
          </Button>
        </div>
      </div>

      <Collapsible open={pfToolsOpen} onOpenChange={setPfToolsOpen}>
        <CollapsibleContent className="shrink-0 border-b border-border/50 px-2 py-2 sm:px-3">
          <PricefinderResearchPanel variant="compact" address={suburbName} showWidgetSlot={false} />
        </CollapsibleContent>
      </Collapsible>

      {mode === "api" ? <MarketSuburbStats market={market} className="shrink-0" /> : null}

      {plotError ? (
        <p className="shrink-0 px-2 py-0.5 text-[10px] text-destructive sm:px-3">{plotError}</p>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <MarketMapPanel
          market={market}
          properties={displayProperties}
          ownerLinksByPropertyId={ownerLinksByPropertyId}
          propertyUrgencyById={propertyUrgencyById}
          propertyListingPinById={propertyListingPinById}
          pfByPropertyId={pfByPropertyId}
          pricefinderMode={mode}
          selectedPropertyId={selectedPropertyId}
          onSelectProperty={setSelectedPropertyId}
          onOpenStreetView={(lat, lng, label) => setStreetView({ lat, lng, label })}
          onImportReport={setImportPropertyId}
          needsGeocodeCount={needsGeocodeCount}
          plotting={plotting}
          onPlotAddresses={() => void plotProperties()}
          pinDropMode={pinDropMode}
          draftPick={draftPick}
          onDraftPick={resolveDraftPick}
          onProspectPinMoved={(propertyId, lat, lng) => void handleProspectPinMoved(propertyId, lat, lng)}
          fill
        />

        {draftPick ? (
          <MapProspectPickBar
            pick={draftPick}
            pinDropMode={pinDropMode}
            onConfirm={handleConfirmDraftPick}
            onCancel={handleCancelDraftPick}
          />
        ) : null}

        {propertyListOpen ? (
          <div className="absolute bottom-2 left-2 right-2 z-20 max-h-[38%] overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-lg backdrop-blur-sm sm:left-auto sm:right-2 sm:w-80">
            <div className="flex items-center justify-between border-b border-border/60 px-2 py-1">
              <span className="text-[11px] font-medium">Pinned properties</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setPropertyListOpen(false)}
              >
                Close
              </Button>
            </div>
            <MarketPropertyList
              properties={displayProperties}
              selectedPropertyId={selectedPropertyId}
              onSelect={setSelectedPropertyId}
              className="max-h-[calc(38vh-2rem)] border-0"
            />
          </div>
        ) : null}

        {streetView != null ? (
          <div className="absolute bottom-2 right-2 z-20 w-[min(100%,420px)] overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-xl backdrop-blur-sm">
            <MarketStreetViewPanel
              open
              lat={streetView.lat}
              lng={streetView.lng}
              label={streetView.label}
              onClose={() => setStreetView(null)}
              className="max-h-[min(42vh,320px)] border-0"
            />
          </div>
        ) : null}
      </div>

      {importProperty ? (
        <PropertyReportUploadDialog
          open={importPropertyId != null}
          onOpenChange={(open) => {
            if (!open) setImportPropertyId(null);
          }}
          propertyId={importProperty.id}
          address={formatPropertyAddress(importProperty as Property)}
          existingReport={importProperty.property_report ?? null}
          linkedContactIds={(ownerLinksByPropertyId[importProperty.id] ?? []).map((o) => o.contactId)}
          linkedContactNames={(ownerLinksByPropertyId[importProperty.id] ?? []).map((o) => o.contactName)}
          onApplied={handleProspectingComplete}
        />
      ) : null}

      <ProspectFromMapDialog
        open={prospectDialogOpen}
        onOpenChange={(open) => {
          setProspectDialogOpen(open);
          if (!open) setProspectSeed(null);
        }}
        market={market}
        seed={prospectSeed}
        onPropertyCreated={handlePropertyCreated}
      />
    </div>
  );
}
