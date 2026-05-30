import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts, type ContactWithMeta } from "@/hooks/useContacts";
import { useProperties, type PropertyWithLinks } from "@/hooks/useProperties";
import {
  buildMarketStats,
  getPropertiesForMarket,
  isOwnerLinkRole,
  type PropertyForMarket,
} from "@/lib/contactMarkets";
import {
  CONTACT_MARKETS_EVENT,
  loadContactMarkets,
  saveContactMarkets,
} from "@/lib/contactMarketsPrefs";
import { MarketEditorDialog } from "@/components/contacts/MarketEditorDialog";
import { MarketSuburbCard } from "@/components/markets/MarketTerritorySection";
import { useGeocodeBlockedMessage } from "@/hooks/usePropertyGeocode";
import type { PropertyOwnerLink } from "@/components/markets/MarketMapPanel";

function toPropertyForMarket(p: PropertyWithLinks): PropertyForMarket & { id: string } {
  const ext = p as PropertyWithLinks & {
    street_address?: string | null;
    address?: string | null;
    suburb?: string | null;
    latitude?: number | null;
    longitude?: number | null;
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
  };
}

export default function ContactMarkets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const marketParam = searchParams.get("market");
  const { data: contacts, isLoading: contactsLoading, isError, refetch } = useContacts();
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
    if (!marketParam) return;
    const el = document.getElementById(`market-${marketParam}`);
    if (el) {
      window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    }
  }, [marketParam, markets.length]);

  const propertiesForMarkets = useMemo(
    () => properties.map(toPropertyForMarket),
    [properties],
  );

  const stats = useMemo(
    () => buildMarketStats((contacts ?? []) as ContactWithMeta[], markets, propertiesForMarkets),
    [contacts, markets, propertiesForMarkets],
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

  const totalOwners = useMemo(() => stats.reduce((sum, s) => sum + s.total, 0), [stats]);
  const totalPropertiesOnMap = useMemo(() => stats.reduce((sum, s) => sum + s.propertyCount, 0), [stats]);
  const isLoading = contactsLoading || propertiesLoading;

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
      <div className="animate-fade-in flex flex-col gap-4 pb-6">
        <PageHeader title="My Markets" description="Loading your farming territories…" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[380px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in flex flex-col gap-4 pb-6">
        <PageHeader title="My Markets" />
        <p className="text-sm text-muted-foreground">Could not load contacts.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col gap-4 pb-6">
      <PageHeader
        title="My Markets"
        description="Your farm suburbs as cards — each shows owners, property count, and a live map with CRM pins."
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1.5" />
            Manage markets
          </Button>
        }
      />

      <p className="text-xs text-muted-foreground -mt-2">
        {markets.length} suburbs · {totalPropertiesOnMap} properties · {totalOwners} linked owners · pan, zoom & Street
        View on each map
      </p>

      {geocodeBlockedMessage ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Map pins need Geocoding API</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/90">{geocodeBlockedMessage}</p>
          <p className="mt-2 text-xs text-amber-100/80">
            Enable{" "}
            <a
              href="https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Geocoding API
            </a>{" "}
            or{" "}
            <a
              href="https://console.cloud.google.com/apis/library/places.googleapis.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Places API (New)
            </a>{" "}
            on the same project as your browser key, then hard-refresh.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((row) => (
          <MarketSuburbCard
            key={row.market.id}
            stats={row}
            properties={getPropertiesForMarket(propertiesForMarkets, row.market) as Array<
              PropertyForMarket & { id: string }
            >}
            ownerLinksByPropertyId={ownerLinksByPropertyId}
            selected={marketParam === row.market.id}
            onSelect={() => selectMarket(row.market.id)}
          />
        ))}
      </div>

      {markets.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No markets configured. Add Victoria Point, Redland Bay, and your other farm areas.
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
