import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts, type ContactWithMeta } from "@/hooks/useContacts";
import { useListings } from "@/hooks/useListings";
import { useProperties, type PropertyWithLinks } from "@/hooks/useProperties";
import {
  buildMarketStats,
  buildPropertyPinUrgencyMap,
  findMarketById,
  getPropertiesForMarket,
  isOwnerLinkRole,
  type PropertyForMarket,
} from "@/lib/contactMarkets";
import {
  CONTACT_MARKETS_EVENT,
  loadContactMarkets,
  saveContactMarkets,
} from "@/lib/contactMarketsPrefs";
import { loadSessionMarketId, saveSessionMarketId } from "@/lib/marketMapSession";
import { hasValidCoordinates } from "@/lib/propertyGeocode";
import { MarketEditorDialog } from "@/components/contacts/MarketEditorDialog";
import { MarketMapWorkspace } from "@/components/markets/MarketMapWorkspace";
import { MarketSuburbListItem } from "@/components/markets/MarketSuburbListItem";
import { useGeocodeBlockedMessage } from "@/hooks/usePropertyGeocode";
import { layout } from "@/lib/designTokens";
import { buildMarketListingPinData } from "@/lib/marketListingPins";
import type { PropertyOwnerLink } from "@/components/markets/MarketMapPanel";
import { cn } from "@/lib/utils";

/** Viewport height minus header + main padding (matches MainLayout). */
const MAP_VIEW_HEIGHT = `calc(100dvh - ${layout.headerHeight} - 2.5rem)`;

function toPropertyForMarket(p: PropertyWithLinks): PropertyForMarket & { id: string; property_report?: Record<string, unknown> | null } {
  const ext = p as PropertyWithLinks & {
    street_address?: string | null;
    address?: string | null;
    suburb?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    property_report?: Record<string, unknown> | null;
  };
  return {
    id: p.id,
    address_line1: p.address_line1 ?? ext.street_address ?? ext.address ?? null,
    street_address: ext.street_address ?? null,
    address: ext.address ?? null,
    suburb: ext.suburb ?? p.city,
    city: p.city,
    state: p.state,
    postcode: p.postcode,
    latitude: ext.latitude ?? null,
    longitude: ext.longitude ?? null,
    property_report: ext.property_report ?? null,
  };
}

export default function ContactMarkets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const marketParam = searchParams.get("market");
  const { data: contacts, isLoading: contactsLoading, isError, refetch } = useContacts();
  const { data: listings = [], isLoading: listingsLoading } = useListings();
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const [markets, setMarkets] = useState(() => loadContactMarkets());
  const [editorOpen, setEditorOpen] = useState(false);
  const geocodeBlockedMessage = useGeocodeBlockedMessage();

  useEffect(() => {
    const sync = () => setMarkets(loadContactMarkets());
    window.addEventListener(CONTACT_MARKETS_EVENT, sync);
    return () => window.removeEventListener(CONTACT_MARKETS_EVENT, sync);
  }, []);

  useEffect(() => {
    if (marketParam || markets.length === 0) return;
    const fromSession = loadSessionMarketId();
    if (fromSession && findMarketById(markets, fromSession)) {
      setSearchParams({ market: fromSession }, { replace: true });
    }
  }, [marketParam, markets, setSearchParams]);

  useEffect(() => {
    saveSessionMarketId(marketParam);
  }, [marketParam]);

  const propertiesForMarkets = useMemo(
    () => properties.map(toPropertyForMarket),
    [properties],
  );

  const stats = useMemo(
    () => buildMarketStats((contacts ?? []) as ContactWithMeta[], markets, propertiesForMarkets),
    [contacts, markets, propertiesForMarkets],
  );

  const propertyUrgencyById = useMemo(
    () => buildPropertyPinUrgencyMap((contacts ?? []) as ContactWithMeta[]),
    [contacts],
  );

  const ownerLinksByPropertyId = useMemo(() => {
    const map: Record<string, PropertyOwnerLink[]> = {};
    for (const contact of contacts ?? []) {
      for (const link of contact.contact_property_links ?? []) {
        if (!isOwnerLinkRole(link.role)) continue;
        const propertyId = link.property_id;
        if (!propertyId) continue;
        const name =
          (contact as ContactWithMeta).name?.trim() ||
          [(contact as { first_name?: string }).first_name, (contact as { last_name?: string }).last_name]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          "Contact";
        if (!map[propertyId]) map[propertyId] = [];
        map[propertyId].push({ contactId: contact.id, contactName: name, role: link.role });
      }
    }
    return map;
  }, [contacts]);

  const pinnedCountByMarketId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of stats) {
      const props = getPropertiesForMarket(propertiesForMarkets, row.market);
      counts[row.market.id] = props.filter(hasValidCoordinates).length;
    }
    return counts;
  }, [stats, propertiesForMarkets]);

  const selectedStats = useMemo(
    () => stats.find((s) => s.market.id === marketParam) ?? null,
    [stats, marketParam],
  );

  const marketListingData = useMemo(() => {
    if (!selectedStats) {
      return {
        pinByPropertyId: {} as Record<string, import("@/lib/marketListingPins").PropertyListingPinMeta>,
        extraProperties: [] as Array<PropertyForMarket & { id: string }>,
      };
    }
    return buildMarketListingPinData(
      listings,
      propertiesForMarkets as Array<PropertyForMarket & { id: string }>,
      selectedStats.market,
    );
  }, [selectedStats, propertiesForMarkets, listings]);

  const selectedProperties = useMemo(() => {
    if (!selectedStats) return [];
    const base = getPropertiesForMarket(propertiesForMarkets, selectedStats.market) as Array<
      PropertyForMarket & { id: string; property_report?: Record<string, unknown> | null }
    >;
    const baseIds = new Set(base.map((p) => p.id));
    const extras = marketListingData.extraProperties.filter((p) => !baseIds.has(p.id));
    return [...base, ...extras];
  }, [selectedStats, propertiesForMarkets, marketListingData.extraProperties]);

  const propertyListingPinById = marketListingData.pinByPropertyId;

  const isLoading = contactsLoading || propertiesLoading || listingsLoading;

  const selectMarket = (marketId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (next.get("market") === marketId) next.delete("market");
        else next.set("market", marketId);
        return next;
      },
      { replace: true },
    );
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in flex flex-col gap-2" style={{ height: MAP_VIEW_HEIGHT }}>
        <Skeleton className="h-8 w-48" />
        <div className="flex min-h-0 flex-1 gap-3">
          <Skeleton className="hidden w-52 shrink-0 md:block" />
          <Skeleton className="min-h-0 flex-1" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in flex flex-col gap-4">
        <h1 className="text-lg font-semibold">My Markets</h1>
        <p className="text-sm text-muted-foreground">Could not load contacts.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "animate-fade-in flex min-h-0 flex-col",
        "-mx-4 -mb-20 sm:-mx-6 md:-mb-6",
      )}
      style={{ height: MAP_VIEW_HEIGHT }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-base font-semibold leading-tight">My Markets</h1>
          <p className="text-[11px] text-muted-foreground">Click pins · drop pin on map · right-click to prospect</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => setEditorOpen(true)}>
          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
          Manage
        </Button>
      </div>

      {geocodeBlockedMessage ? (
        <div className="mx-4 mb-2 shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 sm:mx-6">
          <span className="font-medium text-amber-50">Geocoding API required for pins — </span>
          {geocodeBlockedMessage}
        </div>
      ) : null}

      {markets.length === 0 ? (
        <div className="mx-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground sm:mx-6">
          No markets configured. Add Victoria Point, Redland Bay, and your other farm areas.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 sm:flex-row sm:gap-0 sm:px-0">
          <aside className="flex shrink-0 flex-row gap-1.5 overflow-x-auto pb-1 sm:w-52 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:border-r sm:border-border/50 sm:px-2 sm:pb-0 md:w-56">
            {stats.map((row) => (
              <MarketSuburbListItem
                key={row.market.id}
                stats={row}
                pinnedCount={pinnedCountByMarketId[row.market.id] ?? 0}
                selected={marketParam === row.market.id}
                onSelect={() => selectMarket(row.market.id)}
                compact
              />
            ))}
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:border-l-0">
            {selectedStats ? (
              <MarketMapWorkspace
                stats={selectedStats}
                properties={selectedProperties}
                ownerLinksByPropertyId={ownerLinksByPropertyId}
                propertyUrgencyById={propertyUrgencyById}
                propertyListingPinById={propertyListingPinById}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center border border-dashed border-border/60 bg-muted/10 p-8 text-center sm:mx-2 sm:rounded-lg">
                <p className="text-sm text-muted-foreground">Select a suburb to open the farming map.</p>
              </div>
            )}
          </main>
        </div>
      )}

      <MarketEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        markets={markets}
        onSave={(next) => {
          saveContactMarkets(next);
          setMarkets(next);
        }}
      />
    </div>
  );
}
