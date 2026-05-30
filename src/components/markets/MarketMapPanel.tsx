import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ContactMarket, PropertyForMarket } from "@/lib/contactMarkets";
import { formatPropertyAddress, type Property } from "@/hooks/useProperties";
import { ensureGoogleMapsLoaded, getGoogleMapsApiKey, getGoogleMapsMapId } from "@/lib/loadGoogleMaps";
import { geocodeAddressString, hasValidCoordinates, isGeocodeServiceBlocked } from "@/lib/propertyGeocode";
import { cn } from "@/lib/utils";

const REDLANDS_DEFAULT = { lat: -27.5877, lng: 153.2667 };

export type PropertyOwnerLink = {
  contactId: string;
  contactName: string;
  role?: string | null;
};

type MapProperty = PropertyForMarket & { id: string };

type Props = {
  market: ContactMarket;
  properties: MapProperty[];
  ownerLinksByPropertyId: Record<string, PropertyOwnerLink[]>;
  onPlotAddresses?: () => void;
  plotting?: boolean;
  needsGeocodeCount?: number;
  mapHeightClass?: string;
  className?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInfoWindowHtml(property: MapProperty, owners: PropertyOwnerLink[]): string {
  const addr = formatPropertyAddress(property as Property);
  const ownerLines =
    owners.length > 0
      ? owners
          .map(
            (o) =>
              `<a href="/contacts/${escapeHtml(o.contactId)}" style="color:#00bcd4;font-weight:500">${escapeHtml(o.contactName)}</a>`,
          )
          .join(", ")
      : "No linked owner yet";
  return `
    <div style="font-family:system-ui,sans-serif;max-width:240px;line-height:1.45;padding:2px 0">
      <p style="margin:0 0 6px;font-weight:600;font-size:13px;color:#111">${escapeHtml(addr || "Property")}</p>
      <p style="margin:0 0 10px;font-size:11px;color:#555">${escapeHtml(owners.length ? "Owners" : "CRM property")}: ${ownerLines}</p>
      <a href="/properties/${escapeHtml(property.id)}" style="font-size:12px;color:#00bcd4;font-weight:600">Open property record →</a>
    </div>
  `;
}

function buildMapOptions(center: google.maps.LatLngLiteral): google.maps.MapOptions {
  return {
    center,
    zoom: 13,
    mapId: getGoogleMapsMapId(),
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
    streetViewControl: true,
    streetViewControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER,
    },
    fullscreenControl: true,
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER,
    },
    scaleControl: true,
    rotateControl: true,
    gestureHandling: "greedy",
    clickableIcons: false,
  };
}

export function MarketMapPanel({
  market,
  properties,
  ownerLinksByPropertyId,
  onPlotAddresses,
  plotting = false,
  needsGeocodeCount = 0,
  mapHeightClass = "min-h-[340px]",
  className,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const apiKey = getGoogleMapsApiKey();
  const mappable = properties.filter(hasValidCoordinates);
  const mapInstanceKey = market.id;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    let cancelled = false;

    ensureGoogleMapsLoaded(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        mapInstanceRef.current = new google.maps.Map(mapRef.current, buildMapOptions(REDLANDS_DEFAULT));
        infoWindowRef.current = new google.maps.InfoWindow({ maxWidth: 280 });
        setMapReady(true);
        setMapError(null);
        window.setTimeout(() => {
          google.maps.event.trigger(mapInstanceRef.current!, "resize");
        }, 150);
      })
      .catch((err: unknown) => {
        setMapError(err instanceof Error ? err.message : "Could not load Google Maps");
      });

    return () => {
      cancelled = true;
      for (const marker of markersRef.current) marker.map = null;
      markersRef.current = [];
      mapInstanceRef.current = null;
      infoWindowRef.current = null;
      setMapReady(false);
    };
  }, [apiKey, mapInstanceKey]);

  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        google.maps.event.trigger(mapInstanceRef.current, "resize");
      }
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    let cancelled = false;

    (async () => {
      for (const marker of markersRef.current) marker.map = null;
      markersRef.current = [];

      if (mappable.length === 0) {
        const suburbQuery = `${market.suburbs[0] ?? market.label}, ${market.state ?? "QLD"}, Australia`;
        if (apiKey && !isGeocodeServiceBlocked()) {
          const outcome = await geocodeAddressString(suburbQuery, apiKey);
          if (cancelled || !mapInstanceRef.current) return;
          if (outcome.ok) {
            mapInstanceRef.current.setCenter({ lat: outcome.lat, lng: outcome.lng });
            mapInstanceRef.current.setZoom(14);
          } else {
            mapInstanceRef.current.setCenter(REDLANDS_DEFAULT);
            mapInstanceRef.current.setZoom(12);
          }
          google.maps.event.trigger(mapInstanceRef.current, "resize");
        } else {
          map.setCenter(REDLANDS_DEFAULT);
          map.setZoom(12);
        }
        return;
      }

      const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary(
        "marker",
      )) as google.maps.MarkerLibrary;
      if (cancelled) return;

      const bounds = new google.maps.LatLngBounds();
      for (const property of mappable) {
        const lat = property.latitude!;
        const lng = property.longitude!;
        const position = { lat, lng };
        bounds.extend(position);

        const pin = new PinElement({
          background: "#00BCD4",
          borderColor: "#ffffff",
          glyphColor: "#00BCD4",
          scale: 0.85,
        });
        const marker = new AdvancedMarkerElement({
          map,
          position,
          title: formatPropertyAddress(property as Property),
          content: pin,
        });
        marker.addEventListener("gmp-click", () => {
          const iw = infoWindowRef.current;
          if (!iw) return;
          iw.setContent(buildInfoWindowHtml(property, ownerLinksByPropertyId[property.id] ?? []));
          iw.open({ map, anchor: marker });
        });
        markersRef.current.push(marker);
      }

      if (mappable.length === 1) {
        map.setCenter({ lat: mappable[0]!.latitude!, lng: mappable[0]!.longitude! });
        map.setZoom(16);
      } else {
        map.fitBounds(bounds, 56);
      }

      window.setTimeout(() => google.maps.event.trigger(map, "resize"), 100);
    })().catch(() => {
      // map library load failure handled by init effect
    });

    return () => {
      cancelled = true;
      for (const marker of markersRef.current) marker.map = null;
      markersRef.current = [];
    };
  }, [apiKey, mapReady, market.id, mappable.length, properties, ownerLinksByPropertyId]);

  if (!apiKey) {
    return (
      <Card className={cn("flex items-center justify-center p-6 text-center", mapHeightClass, className)}>
        <div className="max-w-sm space-y-2">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Google Maps not configured</p>
          <p className="text-xs text-muted-foreground">
            Add <code className="rounded bg-muted px-1">VITE_GOOGLE_MAPS_API_KEY</code> with Maps JavaScript and
            Places API enabled.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border/80 bg-muted/20", className)}>
      {mapError ? (
        <div className={cn("flex items-center justify-center p-4 text-sm text-destructive", mapHeightClass)}>{mapError}</div>
      ) : (
        <>
          {!mapReady ? (
            <div className={cn("flex items-center justify-center gap-2 text-sm text-muted-foreground", mapHeightClass)}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading map…
            </div>
          ) : null}
          <div
            ref={mapRef}
            className={cn("w-full", mapHeightClass, !mapReady && "absolute opacity-0 pointer-events-none h-0 min-h-0")}
          />
        </>
      )}

      <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1.5">
        {needsGeocodeCount > 0 && onPlotAddresses ? (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs shadow-md bg-background/95 backdrop-blur-sm"
            disabled={plotting}
            onClick={onPlotAddresses}
          >
            {plotting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                Plotting…
              </>
            ) : (
              <>Drop {needsGeocodeCount} pins</>
            )}
          </Button>
        ) : null}
      </div>

      <div className="absolute bottom-0 inset-x-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm">
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {mappable.length} pinned
          </span>
          <span>{properties.length} in suburb</span>
        </span>
        {mappable.length === 0 && properties.length > 0 ? (
          <span className="text-amber-600 dark:text-amber-400">Tap “Drop pins” to geocode addresses</span>
        ) : null}
        {properties.length === 0 ? <span>Add properties with this suburb to see pins</span> : null}
      </div>
    </div>
  );
}
