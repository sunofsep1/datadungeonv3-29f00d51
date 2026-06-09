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
import { ProspectDrawer } from "@/components/markets/ProspectDrawer";
import { MarketPropertyList } from "@/components/markets/MarketPropertyList";
import { MarketStreetViewPanel } from "@/components/markets/MarketStreetViewPanel";
import { MarketSuburbStats } from "@/components/markets/MarketSuburbStats";
import { ProspectFromMapDialog, type ProspectMapSeed } from "@/components/markets/ProspectFromMapDialog";
import { PropertyReportUploadDialog } from "@/components/pricefinder/PropertyReportUploadDialog";
import { PricefinderResearchPanel } from "@/components/pricefinder/PricefinderResearchPanel";
import { usePricefinderMode } from "@/hooks/usePricefinderMode";
import { usePropertyGeocode } from "@/hooks/usePropertyGeocode";
import { useToast } from "@/hooks/use-toast";
import type { MarketStats, PropertyForMarket, PropertyPinUrgency } from "@/lib/contactMarkets";
import { listingIdFromMapPropertyId, type PropertyListingPinMeta } from "@/lib/marketListingPins";
import { getGoogleMapsApiKey } from "@/lib/loadGoogleMaps";
import {
  formatPropertyGeocodeAddress,
  geocodePropertiesBatch,
  geocodeStatusMessage,
  getGeocodeBlockedMessage,
  hasValidCoordinates,
  isGeocodeServiceBlocked,
  propertyNeedsGeocode,
  reverseGeocodeLatLng,
} from "@/lib/propertyGeocode";
import { type MapProspectPick } from "@/lib/mapProspectPick";
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
  propertyLastTouchById?: Record<string, Date>;
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
  propertyLastTouchById = {},
}: Props) {
  const { market } = stats;
  const suburbName = market.suburbs[0] ?? market.label;
  const { mode } = usePricefinderMode();
  const { saveCoordsBatch, saveCoords } = usePropertyGeocode();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [localCoords, setLocalCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [plotting, setPlotting] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [importPropertyId, setImportPropertyId] = useState<string | null>(null);
  const [prospectDialogOpen, setProspectDialogOpen] = useState(false);
  const [prospectSeed, setProspectSeed] = useState<ProspectMapSeed | null>(null);
  const [pinDropMode, setPinDropMode] = useState(false);
  const [draftPick, setDraftPick] = useState<MapProspectPick | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [keepDropModeAfterSave, setKeepDropModeAfterSave] = useState(true);
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

  const statsBar = useMemo(() => {
    const overdue = displayProperties.filter((p) => propertyUrgencyById[p.id] === "immediate").length;
    const now = Date.now();
    const thirtyDaysMs = 30 * 86_400_000;
    const contactedThisMonth = displayProperties.filter((p) => {
      const d = propertyLastTouchById[p.id];
      return d && now - d.getTime() <= thirtyDaysMs;
    }).length;
    const touchedProps = displayProperties
      .map((p) => propertyLastTouchById[p.id])
      .filter((d): d is Date => !!d);
    const avgDays =
      touchedProps.length > 0
        ? Math.round(touchedProps.reduce((sum, d) => sum + (now - d.getTime()) / 86_400_000, 0) / touchedProps.length)
        : null;
    return { overdue, contactedThisMonth, avgDays };
  }, [displayProperties, propertyUrgencyById, propertyLastTouchById]);

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
      setPlotError("Google Maps API key missing — set VITE_GOOGLE_MAPS_API_KEY in .env");
      return;
    }
    if (isGeocodeServiceBlocked()) {
      setPlotError(getGeocodeBlockedMessage() ?? "Geocoding unavailable");
      return;
    }

    if (displayProperties.length === 0) {
      setPlotError("No CRM properties in this market yet — use Drop pin or Search address to prospect.");
      toast({
        title: "Nothing to plot",
        description: "No properties in this market. Drop a pin on the map or search an address to add one.",
      });
      return;
    }

    const noAddressExamples = displayProperties
      .filter((p) => !formatPropertyGeocodeAddress(p) && !hasValidCoordinates(p))
      .slice(0, 2)
      .map((p) => p.address_line1 || p.suburb || p.city || "Unknown")
      .filter(Boolean);

    setPlotting(true);
    setPlotError(null);
    try {
      let coordsAcc = { ...localCoords };
      let totalSaved = 0;
      let totalFailed = 0;
      let sampleFailedAddress: string | undefined;
      let emptyRounds = 0;
      const pendingSave: Array<{ propertyId: string; lat: number; lng: number }> = [];

      for (let round = 0; round < 20; round++) {
        const pending = mergeCoords(properties, coordsAcc).filter(propertyNeedsGeocode);
        if (pending.length === 0) break;

        const { results, blockedStatus, failedCount, sampleFailedAddress: batchSample } =
          await geocodePropertiesBatch(pending, apiKey, {
          limit: 50,
          delayMs: 150,
        });
        if (blockedStatus) {
          setPlotError(getGeocodeBlockedMessage() ?? "Geocoding API not enabled");
          break;
        }
        totalFailed += failedCount ?? 0;
        if (!sampleFailedAddress && batchSample) sampleFailedAddress = batchSample;
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
      const skippedNoAddress = displayProperties.filter(
        (p) => !formatPropertyGeocodeAddress(p) && !hasValidCoordinates(p),
      ).length;

      if (stillPending === 0 && totalSaved > 0) {
        setPlotError(null);
        toast({
          title: `Plotted ${totalSaved} pin${totalSaved === 1 ? "" : "s"}`,
          description:
            skippedNoAddress > 0
              ? `${skippedNoAddress} propert${skippedNoAddress === 1 ? "y" : "ies"} skipped (incomplete address${noAddressExamples.length ? `: ${noAddressExamples.join(", ")}` : ""})`
              : undefined,
        });
      } else if (totalSaved === 0) {
        const msg = isGeocodeServiceBlocked()
          ? (getGeocodeBlockedMessage() ?? "Geocoding API blocked — enable Geocoding + Places API on your Google key.")
          : skippedNoAddress > 0
            ? `Could not geocode — ${skippedNoAddress} propert${skippedNoAddress === 1 ? "y has" : "ies have"} incomplete addresses${noAddressExamples.length ? ` (e.g. ${noAddressExamples.join(", ")})` : ""}. Add street numbers or use Drop pin.`
            : totalFailed > 0
              ? `${totalFailed} address${totalFailed === 1 ? "" : "es"} could not be matched${sampleFailedAddress ? ` (e.g. ${sampleFailedAddress})` : ""}. Check Google Cloud: Geocoding API + Places API enabled on your browser key, then hard-refresh.`
              : "Could not geocode — check addresses or retry Drop pins.";
        setPlotError(msg);
        toast({ title: "Geocoding failed", description: msg, variant: "destructive" });
      } else if (stillPending > 0) {
        toast({
          title: `Plotted ${totalSaved} pin${totalSaved === 1 ? "" : "s"}`,
          description: `${stillPending} still need geocoding — retry Drop pins.`,
        });
      }
    } catch (e: unknown) {
      setPlotError(e instanceof Error ? e.message : "Geocoding failed");
    } finally {
      setPlotting(false);
    }
  }, [properties, localCoords, saveCoordsBatch, displayProperties, toast]);

  useEffect(() => {
    setSelectedPropertyId(null);
    setStreetView(null);
    setLocalCoords({});
    setPropertyListOpen(false);
    setProspectDialogOpen(false);
    setProspectSeed(null);
    setPinDropMode(false);
    setDraftPick(null);
    setDrawerOpen(false);
  }, [market.id]);

  const resolveDraftPick = useCallback(
    (pick: MapProspectPick) => {
      setDraftPick({ ...pick, resolving: true, geocodeError: null });
      setDrawerOpen(true);
      setPinDropMode(true);
      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) {
        const err = "Google Maps API key missing — enter address manually";
        setDraftPick({ ...pick, resolving: false, geocodeError: err });
        toast({ title: "Address lookup unavailable", description: err, variant: "destructive" });
        return;
      }
      if (isGeocodeServiceBlocked()) {
        const err = getGeocodeBlockedMessage() ?? "Geocoding unavailable — enter address manually";
        setDraftPick({ ...pick, resolving: false, geocodeError: err });
        toast({ title: "Address lookup blocked", description: err, variant: "destructive" });
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
            geocodeError: null,
          });
        } else {
          const err = geocodeStatusMessage(outcome.status);
          setDraftPick({
            lat: pick.lat,
            lng: pick.lng,
            addressLine: "",
            resolving: false,
            geocodeError: err,
          });
          toast({
            title: "Could not look up address",
            description: `${err} Enter the address manually below.`,
            variant: "destructive",
          });
        }
      });
    },
    [toast],
  );

  const handleCancelDraftPick = useCallback(() => {
    resolvePickRequestRef.current += 1;
    setDraftPick(null);
    setDrawerOpen(false);
    setPinDropMode(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "d" || e.key === "D") {
        setPinDropMode((v) => {
          const next = !v;
          if (!next) {
            setDraftPick(null);
            setDrawerOpen(false);
          }
          return next;
        });
      }
      if (e.key === "Escape") {
        if (drawerOpen) {
          handleCancelDraftPick();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, handleCancelDraftPick]);

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

  const handleDrawerClose = useCallback(() => {
    resolvePickRequestRef.current += 1;
    setDraftPick(null);
    setDrawerOpen(false);
    if (!keepDropModeAfterSave) setPinDropMode(false);
  }, [keepDropModeAfterSave]);

  const handleDrawerDone = useCallback(() => {
    handleDrawerClose();
    if (keepDropModeAfterSave) setPinDropMode(true);
  }, [handleDrawerClose, keepDropModeAfterSave]);

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
                if (!next) {
                  setDraftPick(null);
                  setDrawerOpen(false);
                }
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
              setDraftPick({
                lat: -27.5877,
                lng: 153.2667,
                resolving: false,
                addressLine: "",
                geocodeError: null,
              });
              setDrawerOpen(true);
              setPinDropMode(false);
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

      <div className="flex shrink-0 items-center gap-3 border-b border-border/30 bg-muted/20 px-2 py-1 sm:px-3">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground">{statsBar.overdue}</span> overdue
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-cyan-500" />
          <span className="text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground">{statsBar.contactedThisMonth}</span> touched this month
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">
            Avg{" "}
            <span className="font-semibold text-foreground">
              {statsBar.avgDays != null ? `${statsBar.avgDays}d` : "—"}
            </span>{" "}
            since touch
          </span>
        </div>
      </div>

      <Collapsible open={pfToolsOpen} onOpenChange={setPfToolsOpen}>
        <CollapsibleContent className="shrink-0 border-b border-border/50 px-2 py-2 sm:px-3">
          <PricefinderResearchPanel variant="compact" address={suburbName} showWidgetSlot={false} />
        </CollapsibleContent>
      </Collapsible>

      {mode === "api" ? <MarketSuburbStats market={market} className="shrink-0" /> : null}

      {plotError ? (
        <div className="flex shrink-0 items-center justify-between gap-2 px-2 py-0.5 sm:px-3">
          <p className="text-[10px] text-destructive">{plotError}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground shrink-0"
            onClick={() => setPlotError(null)}
          >
            Dismiss
          </Button>
        </div>
      ) : displayProperties.length === 0 ? (
        <p className="shrink-0 px-2 py-0.5 text-[10px] text-muted-foreground sm:px-3">
          No CRM properties in this market yet — use Drop pin or Search address to prospect.
        </p>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <MarketMapPanel
          market={market}
          properties={displayProperties}
          ownerLinksByPropertyId={ownerLinksByPropertyId}
          propertyUrgencyById={propertyUrgencyById}
          propertyListingPinById={propertyListingPinById}
          pfByPropertyId={pfByPropertyId}
          propertyLastTouchById={propertyLastTouchById}
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
          <ProspectDrawer
            open={drawerOpen}
            pick={draftPick}
            market={market}
            pinDropMode={pinDropMode}
            keepDropModeAfterSave={keepDropModeAfterSave}
            onKeepDropModeChange={setKeepDropModeAfterSave}
            onPickChange={(next) => {
              setDraftPick(next);
              if (next.resolving) {
                resolveDraftPick({ lat: next.lat, lng: next.lng });
              }
            }}
            onClose={handleDrawerClose}
            onDone={handleDrawerDone}
            onPropertyCreated={handlePropertyCreated}
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
              propertyUrgencyById={propertyUrgencyById}
              propertyLastTouchById={propertyLastTouchById}
              ownerLinksByPropertyId={ownerLinksByPropertyId}
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
