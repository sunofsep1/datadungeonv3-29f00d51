import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ContactMarket, PropertyForMarket, PropertyPinUrgency } from "@/lib/contactMarkets";
import { formatPropertyAddress, type Property } from "@/hooks/useProperties";
import { ensureGoogleMapsLoaded, getGoogleMapsApiKey, getGoogleMapsMapId } from "@/lib/loadGoogleMaps";
import { geocodeAddressString, hasValidCoordinates, isGeocodeServiceBlocked } from "@/lib/propertyGeocode";
import type { MapProspectPick } from "@/lib/mapProspectPick";
import { streetViewStaticThumbnailUrl } from "@/lib/marketStreetView";
import type { PricefinderPropertyData } from "@/lib/pricefinderTypes";
import type { PricefinderMode } from "@/lib/pricefinderMode";
import {
  LISTING_PIN_COLORS,
  listingIdFromMapPropertyId,
  type PropertyListingPinMeta,
} from "@/lib/marketListingPins";
import { normalizeOwnerName, splitOwnerNames } from "@/lib/ownerNameParse";
import { cn } from "@/lib/utils";

const REDLANDS_DEFAULT = { lat: -27.5877, lng: 153.2667 };

const PIN_COLORS: Record<PropertyPinUrgency | "pf" | "prospect", string> = {
  hot: "#F59E0B",
  stale: "#64748B",
  none: "#00BCD4",
  pf: "#0891B2",
  prospect: "#A855F7",
};

const PROSPECT_PIN_GLOW = "rgba(168, 85, 247, 0.75)";

export type PropertyOwnerLink = {
  contactId: string;
  contactName: string;
  role?: string | null;
};

type MapProperty = PropertyForMarket & {
  id: string;
  property_report?: Record<string, unknown> | null;
};

type Props = {
  market: ContactMarket;
  properties: MapProperty[];
  ownerLinksByPropertyId: Record<string, PropertyOwnerLink[]>;
  propertyUrgencyById?: Record<string, PropertyPinUrgency>;
  propertyListingPinById?: Record<string, PropertyListingPinMeta>;
  pfByPropertyId?: Record<string, PricefinderPropertyData>;
  pricefinderMode?: PricefinderMode;
  selectedPropertyId?: string | null;
  onSelectProperty?: (propertyId: string) => void;
  onOpenStreetView?: (lat: number, lng: number, label: string) => void;
  onImportReport?: (propertyId: string) => void;
  onEnrichProperty?: (propertyId: string) => void;
  onApplyPf?: (propertyId: string, data: PricefinderPropertyData) => void;
  enrichingPropertyId?: string | null;
  onPlotAddresses?: () => void;
  plotting?: boolean;
  needsGeocodeCount?: number;
  mapHeightClass?: string;
  /** Map fills parent container (use with flex parent + min-h-0). */
  fill?: boolean;
  className?: string;
  pinDropMode?: boolean;
  draftPick?: MapProspectPick | null;
  onDraftPick?: (pick: MapProspectPick) => void;
  onProspectPinMoved?: (propertyId: string, lat: number, lng: number) => void;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAud(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
  return `$${Math.round(value / 1000)}k`;
}

function buildOwnerInfoLines(
  property: MapProperty,
  linkedOwners: PropertyOwnerLink[],
  isProspect: boolean,
): string {
  const linkStyle = "color:#0e7490;font-weight:600;text-decoration:underline;text-underline-offset:2px";
  const nameStyle = "color:#1e293b;font-weight:600";
  const reportRaw = property.property_report?.owner_names;
  const reportOwners = splitOwnerNames(typeof reportRaw === "string" ? reportRaw : null);
  const linkedByNorm = new Map(
    linkedOwners.map((o) => [normalizeOwnerName(o.contactName), o] as const),
  );

  if (reportOwners.length > 0) {
    return reportOwners
      .map((name) => {
        const linked = linkedByNorm.get(normalizeOwnerName(name));
        if (linked) {
          return `<a href="/contacts/${escapeHtml(linked.contactId)}" style="${linkStyle}">${escapeHtml(linked.contactName)}</a>`;
        }
        return `<span style="${nameStyle}">${escapeHtml(name)}</span>`;
      })
      .join("<span style=\"color:#94a3b8;margin:0 4px\"> · </span>");
  }

  if (linkedOwners.length > 0) {
    return linkedOwners
      .map(
        (o) =>
          `<a href="/contacts/${escapeHtml(o.contactId)}" style="${linkStyle}">${escapeHtml(o.contactName)}</a>`,
      )
      .join("<span style=\"color:#94a3b8;margin:0 4px\"> · </span>");
  }

  return isProspect
    ? `<span style="color:#64748b;font-weight:500">Prospect — upload Pricefinder to add owners</span>`
    : `<span style="color:#64748b;font-weight:500">No linked owner yet</span>`;
}

const IW = {
  wrap: "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:300px;line-height:1.5;padding:4px 2px;color:#0f172a",
  title: "margin:0 0 8px;font-weight:700;font-size:15px;line-height:1.35;color:#0f172a;letter-spacing:-0.01em",
  sectionLabel: "font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;margin:0 0 4px",
  sectionBody: "margin:0 0 10px;font-size:13px;line-height:1.45;color:#1e293b",
  meta: "margin:0 0 5px;font-size:13px;line-height:1.4;color:#334155",
  metaMuted: "margin:0 0 8px;font-size:13px;line-height:1.4;color:#64748b",
  btn:
    "font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer;line-height:1.2",
  btnPrimary:
    "font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;border:1px solid #0e7490;background:#ecfeff;color:#0e7490;cursor:pointer;line-height:1.2",
  btnAccent:
    "font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;border:1px solid #0891b2;background:#0891b2;color:#fff;cursor:pointer;line-height:1.2",
  recordLink: "font-size:13px;font-weight:700;padding:6px 0;color:#0e7490;text-decoration:none;line-height:1.2",
  badge:
    "display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;line-height:1.3",
} as const;

function buildInfoWindowHtml(
  property: MapProperty,
  owners: PropertyOwnerLink[],
  pf: PricefinderPropertyData | undefined,
  apiKey: string | undefined,
  pricefinderMode: PricefinderMode,
  listingPin?: PropertyListingPinMeta,
  isProspect?: boolean,
): string {
  const addr = formatPropertyAddress(property as Property) || listingPin?.address || "Property";
  const ownerLines = buildOwnerInfoLines(property, owners, isProspect ?? false);
  const ownerLabel =
    splitOwnerNames(
      typeof property.property_report?.owner_names === "string"
        ? property.property_report.owner_names
        : null,
    ).length > 1
      ? "Owners"
      : owners.length || property.property_report?.owner_names
        ? "Owners"
        : "CRM property";

  const lat = property.latitude!;
  const lng = property.longitude!;
  const svThumb =
    apiKey && hasValidCoordinates(property)
      ? streetViewStaticThumbnailUrl(lat, lng, apiKey, "240x120")
      : null;

  const listingBadge = listingPin
    ? `<p style="margin:0 0 10px"><span style="${IW.badge};background:${LISTING_PIN_COLORS[listingPin.kind].fill};color:#fff;box-shadow:0 0 8px ${LISTING_PIN_COLORS[listingPin.kind].glow}">${escapeHtml(LISTING_PIN_COLORS[listingPin.kind].label)} · ${escapeHtml(listingPin.stageLabel)}</span></p>`
    : isProspect
      ? `<p style="margin:0 0 10px"><span style="${IW.badge};background:#A855F7;color:#fff;box-shadow:0 0 8px ${PROSPECT_PIN_GLOW}">Prospect</span></p>`
      : "";

  const pfLines = pf
    ? [
        pf.last_sale_price != null ? `Last sale: ${formatAud(pf.last_sale_price)}` : null,
        pf.last_sale_date ? `Sold: ${escapeHtml(String(pf.last_sale_date))}` : null,
        pf.bedrooms != null ? `${pf.bedrooms} bed · ${pf.bathrooms ?? "?"} bath` : null,
        pf.land_area_sqm != null ? `${pf.land_area_sqm} m² land` : null,
      ]
        .filter(Boolean)
        .map((line) => `<p style="${IW.meta}">${line}</p>`)
        .join("")
    : `<p style="${IW.metaMuted}">${pricefinderMode === "pdf" ? "Import a Pricefinder PDF on this property" : "No Pricefinder data yet"}</p>`;

  const pfActionButton =
    pricefinderMode === "api"
      ? `<button type="button" data-market-action="enrich" data-property-id="${escapeHtml(property.id)}" style="${IW.btnPrimary}">Pricefinder</button>`
      : listingIdFromMapPropertyId(property.id)
        ? ""
        : `<button type="button" data-market-action="import" data-property-id="${escapeHtml(property.id)}" style="${IW.btnPrimary}">${isProspect ? "Import Pricefinder" : "Import report"}</button>`;

  const recordHref = listingPin
    ? `/listings/${escapeHtml(listingPin.listingId)}`
    : `/properties/${escapeHtml(property.id)}`;
  const recordLabel = listingPin ? "Open listing →" : "Open record →";
  const linkedCount = owners.length;

  return `
    <div style="${IW.wrap}">
      ${svThumb ? `<img src="${svThumb}" alt="" style="width:100%;border-radius:8px;margin-bottom:10px" />` : ""}
      <p style="${IW.title}">${escapeHtml(addr || "Property")}</p>
      ${listingBadge}
      <p style="${IW.sectionLabel}">${escapeHtml(ownerLabel)}</p>
      <p style="${IW.sectionBody}">${ownerLines}</p>
      ${linkedCount > 0 ? `<p style="${IW.metaMuted}">${linkedCount} contact${linkedCount === 1 ? "" : "s"} linked in CRM</p>` : ""}
      ${pfLines}
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0">
        <button type="button" data-market-action="streetview" data-property-id="${escapeHtml(property.id)}" style="${IW.btn}">Street View</button>
        ${pfActionButton}
        ${pf && pricefinderMode === "api" ? `<button type="button" data-market-action="apply-pf" data-property-id="${escapeHtml(property.id)}" style="${IW.btnAccent}">Apply</button>` : ""}
        <a href="${recordHref}" style="${IW.recordLink}">${recordLabel}</a>
      </div>
    </div>
  `;
}

function clientPointToLatLng(
  map: google.maps.Map,
  overlay: google.maps.OverlayView,
  clientX: number,
  clientY: number,
): google.maps.LatLngLiteral | null {
  const projection = overlay.getProjection();
  if (!projection) return null;
  const rect = map.getDiv().getBoundingClientRect();
  const point = projection.fromContainerPixelToLatLng(
    new google.maps.Point(clientX - rect.left, clientY - rect.top),
  );
  if (!point) return null;
  return { lat: point.lat(), lng: point.lng() };
}

function buildMapOptions(center: google.maps.LatLngLiteral, pinDropMode: boolean): google.maps.MapOptions {
  return {
    center,
    zoom: 13,
    mapId: getGoogleMapsMapId(),
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
    streetViewControl: false,
    draggableCursor: pinDropMode ? "crosshair" : "default",
    draggingCursor: "move",
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

function createGlowingPinElement(
  kind: PropertyListingPinMeta["kind"] | "prospect" | null,
  color: string,
  selected: boolean,
) {
  const el = document.createElement("div");
  el.style.width = selected ? "18px" : "14px";
  el.style.height = selected ? "18px" : "14px";
  el.style.borderRadius = "50%";
  el.style.backgroundColor = color;
  el.style.border = "2px solid #ffffff";
  el.style.cursor = "pointer";
  el.style.boxSizing = "border-box";
  if (kind === "prospect") {
    el.style.boxShadow = `0 0 6px 2px ${PROSPECT_PIN_GLOW}, 0 0 14px 4px ${PROSPECT_PIN_GLOW}`;
  } else if (kind) {
    const glow = LISTING_PIN_COLORS[kind].glow;
    el.style.boxShadow = `0 0 6px 2px ${glow}, 0 0 14px 4px ${glow}`;
  }
  return el;
}

function isProspectProperty(
  propertyId: string,
  ownerLinksByPropertyId: Record<string, PropertyOwnerLink[]>,
  listingPinMap: Record<string, PropertyListingPinMeta>,
): boolean {
  if (listingPinMap[propertyId]) return false;
  return (ownerLinksByPropertyId[propertyId] ?? []).length === 0;
}

function resolvePinAppearance(
  propertyId: string,
  ownerLinksByPropertyId: Record<string, PropertyOwnerLink[]>,
  listingPinMap: Record<string, PropertyListingPinMeta>,
  urgencyMap: Record<string, PropertyPinUrgency>,
  pfMap: Record<string, PricefinderPropertyData>,
): { color: string; listingKind: PropertyListingPinMeta["kind"] | "prospect" | null } {
  const listingPin = listingPinMap[propertyId];
  if (listingPin) {
    return { color: LISTING_PIN_COLORS[listingPin.kind].fill, listingKind: listingPin.kind };
  }
  if (isProspectProperty(propertyId, ownerLinksByPropertyId, listingPinMap)) {
    return { color: PIN_COLORS.prospect, listingKind: "prospect" };
  }
  if (pfMap[propertyId]) return { color: PIN_COLORS.pf, listingKind: null };
  const u = urgencyMap[propertyId] ?? "none";
  return { color: PIN_COLORS[u], listingKind: null };
}

export function MarketMapPanel({
  market,
  properties,
  ownerLinksByPropertyId,
  propertyUrgencyById = {},
  propertyListingPinById = {},
  pfByPropertyId = {},
  pricefinderMode = "pdf",
  selectedPropertyId = null,
  onSelectProperty,
  onOpenStreetView,
  onImportReport,
  onEnrichProperty,
  onApplyPf,
  enrichingPropertyId = null,
  onPlotAddresses,
  plotting = false,
  needsGeocodeCount = 0,
  mapHeightClass = "min-h-[340px]",
  fill = false,
  className,
  pinDropMode = false,
  draftPick = null,
  onDraftPick,
  onProspectPinMoved,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const draftMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const pickListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const touchCleanupRef = useRef<(() => void) | null>(null);
  const onDraftPickRef = useRef(onDraftPick);
  onDraftPickRef.current = onDraftPick;
  const pinDropModeRef = useRef(pinDropMode);
  pinDropModeRef.current = pinDropMode;
  const onProspectPinMovedRef = useRef(onProspectPinMoved);
  onProspectPinMovedRef.current = onProspectPinMoved;
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markerByIdRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const callbacksRef = useRef({ onOpenStreetView, onEnrichProperty, onApplyPf, onSelectProperty, onImportReport });
  callbacksRef.current = { onOpenStreetView, onEnrichProperty, onApplyPf, onSelectProperty, onImportReport };
  const pfRef = useRef(pfByPropertyId);
  pfRef.current = pfByPropertyId;
  const listingPinRef = useRef(propertyListingPinById);
  listingPinRef.current = propertyListingPinById;
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;
  const marketViewportInitRef = useRef<string | null>(null);
  const lastInfoPropertyIdRef = useRef<string | null>(null);
  const prevSelectedForInfoRef = useRef<string | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    lat: number;
    lng: number;
  } | null>(null);

  const apiKey = getGoogleMapsApiKey();
  const mappable = properties.filter(hasValidCoordinates);
  const mapInstanceKey = market.id;

  useEffect(() => {
    marketViewportInitRef.current = null;
    lastInfoPropertyIdRef.current = null;
    prevSelectedForInfoRef.current = null;
  }, [mapInstanceKey]);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    let cancelled = false;

    ensureGoogleMapsLoaded(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        mapInstanceRef.current = new google.maps.Map(
          mapRef.current,
          buildMapOptions(REDLANDS_DEFAULT, pinDropModeRef.current),
        );
        const iw = new google.maps.InfoWindow({ maxWidth: 320, disableAutoPan: true });
        iw.addListener("closeclick", () => {
          lastInfoPropertyIdRef.current = null;
          prevSelectedForInfoRef.current = null;
        });
        infoWindowRef.current = iw;
        const overlay = new google.maps.OverlayView();
        overlay.onAdd = () => {};
        overlay.draw = () => {};
        overlay.setMap(mapInstanceRef.current);
        overlayRef.current = overlay;
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
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      for (const marker of markersRef.current) marker.map = null;
      markersRef.current = [];
      markerByIdRef.current.clear();
      mapInstanceRef.current = null;
      infoWindowRef.current = null;
      overlayRef.current = null;
      draftMarkerRef.current = null;
      setMapReady(false);
    };
  }, [apiKey, mapInstanceKey]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    map.setOptions({ draggableCursor: pinDropMode ? "crosshair" : "default" });
  }, [mapReady, pinDropMode]);

  const emitDraftPick = (lat: number, lng: number) => {
    setContextMenu(null);
    onDraftPickRef.current?.({ lat, lng, resolving: true });
  };

  useEffect(() => {
    const map = mapInstanceRef.current;
    const overlay = overlayRef.current;
    if (!map || !mapReady || !overlay) return;

    for (const listener of pickListenersRef.current) listener.remove();
    pickListenersRef.current = [];
    touchCleanupRef.current?.();
    touchCleanupRef.current = null;

    const onMapClick = (event: google.maps.MapMouseEvent) => {
      setContextMenu(null);
      if (!pinDropModeRef.current || !event.latLng) return;
      emitDraftPick(event.latLng.lat(), event.latLng.lng());
    };

    const onRightClick = (event: google.maps.MapMouseEvent) => {
      event.domEvent?.preventDefault();
      if (!event.latLng) return;
      const dom = event.domEvent as MouseEvent | undefined;
      if (dom) {
        const rect = map.getDiv().getBoundingClientRect();
        setContextMenu({
          x: dom.clientX - rect.left,
          y: dom.clientY - rect.top,
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        });
      } else {
        emitDraftPick(event.latLng.lat(), event.latLng.lng());
      }
    };

    pickListenersRef.current.push(map.addListener("click", onMapClick));
    pickListenersRef.current.push(map.addListener("rightclick", onRightClick));

    const mapDiv = map.getDiv();
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let pressStart: { x: number; y: number } | null = null;

    const clearPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      pressStart = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0]!;
      pressStart = { x: touch.clientX, y: touch.clientY };
      pressTimer = setTimeout(() => {
        if (!pressStart) return;
        const latLng = clientPointToLatLng(map, overlay, pressStart.x, pressStart.y);
        if (!latLng) return;
        const rect = mapDiv.getBoundingClientRect();
        setContextMenu({
          x: pressStart.x - rect.left,
          y: pressStart.y - rect.top,
          lat: latLng.lat,
          lng: latLng.lng,
        });
        clearPress();
      }, 550);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pressStart || e.touches.length !== 1) return;
      const touch = e.touches[0]!;
      const dx = touch.clientX - pressStart.x;
      const dy = touch.clientY - pressStart.y;
      if (Math.hypot(dx, dy) > 12) clearPress();
    };

    mapDiv.addEventListener("touchstart", onTouchStart, { passive: true });
    mapDiv.addEventListener("touchmove", onTouchMove, { passive: true });
    mapDiv.addEventListener("touchend", clearPress);
    mapDiv.addEventListener("touchcancel", clearPress);
    touchCleanupRef.current = () => {
      clearPress();
      mapDiv.removeEventListener("touchstart", onTouchStart);
      mapDiv.removeEventListener("touchmove", onTouchMove);
      mapDiv.removeEventListener("touchend", clearPress);
      mapDiv.removeEventListener("touchcancel", clearPress);
    };

    return () => {
      for (const listener of pickListenersRef.current) listener.remove();
      pickListenersRef.current = [];
      touchCleanupRef.current?.();
      touchCleanupRef.current = null;
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (!draftPick) {
      if (draftMarkerRef.current) draftMarkerRef.current.map = null;
      draftMarkerRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const { AdvancedMarkerElement } = (await google.maps.importLibrary(
        "marker",
      )) as google.maps.MarkerLibrary;
      if (cancelled) return;

      const position = { lat: draftPick.lat, lng: draftPick.lng };
      const content = createGlowingPinElement("prospect", PIN_COLORS.prospect, true);
      content.style.cursor = "grab";

      if (!draftMarkerRef.current) {
        const marker = new AdvancedMarkerElement({
          map,
          position,
          content,
          gmpDraggable: true,
          zIndex: 2000,
          title: "Drag to adjust prospect location",
        });
        marker.addListener("dragend", () => {
          const pos = marker.position;
          if (!pos) return;
          const lat = typeof pos.lat === "function" ? pos.lat() : Number(pos.lat);
          const lng = typeof pos.lng === "function" ? pos.lng() : Number(pos.lng);
          onDraftPickRef.current?.({ lat, lng, resolving: true });
        });
        draftMarkerRef.current = marker;
      } else {
        draftMarkerRef.current.position = position;
        if (!draftMarkerRef.current.map) draftMarkerRef.current.map = map;
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [mapReady, draftPick?.lat, draftPick?.lng, draftPick != null]);

  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) google.maps.event.trigger(mapInstanceRef.current, "resize");
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const iw = infoWindowRef.current;
    if (!map || !mapReady || !iw) return;

    let cancelled = false;
    const shouldInitViewport = marketViewportInitRef.current !== market.id;

    const wireInfoWindowActions = () => {
      const root = document.querySelector(".gm-style-iw-d");
      if (!root) return;
      root.querySelectorAll("[data-market-action]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          const action = (el as HTMLElement).dataset.marketAction;
          const pid = (el as HTMLElement).dataset.propertyId;
          const prop = propertiesRef.current.find((p) => p.id === pid);
          if (!prop) return;
          if (action === "streetview") {
            if (!hasValidCoordinates(prop)) return;
            callbacksRef.current.onOpenStreetView?.(
              prop.latitude!,
              prop.longitude!,
              formatPropertyAddress(prop as Property) || "Property",
            );
          } else if (action === "enrich") {
            callbacksRef.current.onEnrichProperty?.(prop.id);
          } else if (action === "import") {
            callbacksRef.current.onImportReport?.(prop.id);
          } else if (action === "apply-pf") {
            const data = pfRef.current[prop.id];
            if (data) callbacksRef.current.onApplyPf?.(prop.id, data);
          }
        });
      });
    };

    const openForProperty = (
      property: MapProperty,
      marker: google.maps.marker.AdvancedMarkerElement,
      { reopen = false }: { reopen?: boolean } = {},
    ) => {
      callbacksRef.current.onSelectProperty?.(property.id);
      const listingPin = listingPinRef.current[property.id];
      const prospect = isProspectProperty(property.id, ownerLinksByPropertyId, listingPinRef.current);
      iw.setContent(
        buildInfoWindowHtml(
          property,
          ownerLinksByPropertyId[property.id] ?? [],
          pfRef.current[property.id],
          apiKey,
          pricefinderMode,
          listingPin,
          prospect,
        ),
      );
      const alreadyShowing = lastInfoPropertyIdRef.current === property.id && iw.getMap();
      if (reopen || !alreadyShowing) {
        iw.open({ map, anchor: marker });
        lastInfoPropertyIdRef.current = property.id;
      }
      google.maps.event.addListenerOnce(iw, "domready", wireInfoWindowActions);
    };

    (async () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      for (const marker of markersRef.current) marker.map = null;
      markersRef.current = [];
      markerByIdRef.current.clear();

      if (mappable.length === 0) {
        if (shouldInitViewport) {
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
          marketViewportInitRef.current = market.id;
        }
        return;
      }

      const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary(
        "marker",
      )) as google.maps.MarkerLibrary;
      if (cancelled) return;

      const bounds = new google.maps.LatLngBounds();
      const useCluster = mappable.length > 15;
      for (const property of mappable) {
        const lat = property.latitude!;
        const lng = property.longitude!;
        const position = { lat, lng };
        bounds.extend(position);

        const appearance = resolvePinAppearance(
          property.id,
          ownerLinksByPropertyId,
          propertyListingPinById,
          propertyUrgencyById,
          pfByPropertyId,
        );
        const selected = property.id === selectedPropertyId;
        const isProspect = isProspectProperty(
          property.id,
          ownerLinksByPropertyId,
          propertyListingPinById,
        );
        const markerContent = appearance.listingKind
          ? createGlowingPinElement(appearance.listingKind, appearance.color, selected)
          : (() => {
              const pin = new PinElement({
                background: appearance.color,
                borderColor: "#ffffff",
                glyphColor: appearance.color,
                scale: selected ? 1.1 : 0.9,
              });
              if (pin.element) pin.element.style.cursor = isProspect ? "grab" : "pointer";
              return pin.element;
            })();
        const marker = new AdvancedMarkerElement({
          map: useCluster ? null : map,
          position,
          title: formatPropertyAddress(property as Property),
          content: markerContent,
          gmpClickable: true,
          gmpDraggable: isProspect,
        });
        if (isProspect) {
          marker.addListener("dragend", () => {
            const pos = marker.position;
            if (!pos) return;
            const lat = typeof pos.lat === "function" ? pos.lat() : Number(pos.lat);
            const lng = typeof pos.lng === "function" ? pos.lng() : Number(pos.lng);
            onProspectPinMovedRef.current?.(property.id, lat, lng);
          });
        }
        const onMarkerActivate = () => {
          prevSelectedForInfoRef.current = property.id;
          openForProperty(property, marker, { reopen: true });
        };
        marker.addEventListener("gmp-click", onMarkerActivate);
        marker.addListener?.("click", onMarkerActivate);
        markersRef.current.push(marker);
        markerByIdRef.current.set(property.id, marker);
      }

      if (useCluster) {
        clustererRef.current = new MarkerClusterer({
          map,
          markers: markersRef.current,
          onClusterClick: (_event, cluster, mapInstance) => {
            mapInstance.fitBounds(cluster.bounds);
          },
        });
      }

      if (shouldInitViewport) {
        if (mappable.length === 1) {
          map.setCenter({ lat: mappable[0]!.latitude!, lng: mappable[0]!.longitude! });
          map.setZoom(16);
        } else {
          map.fitBounds(bounds, 56);
        }
        marketViewportInitRef.current = market.id;
      }

      if (selectedPropertyId) {
        const prop = mappable.find((p) => p.id === selectedPropertyId);
        const marker = prop ? markerByIdRef.current.get(prop.id) : null;
        const selectionChanged = prevSelectedForInfoRef.current !== selectedPropertyId;
        if (prop && marker) {
          prevSelectedForInfoRef.current = selectedPropertyId;
          openForProperty(prop, marker, { reopen: selectionChanged });
        }
      } else {
        prevSelectedForInfoRef.current = null;
        lastInfoPropertyIdRef.current = null;
        iw.close();
      }

      window.setTimeout(() => google.maps.event.trigger(map, "resize"), 100);
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    apiKey,
    mapReady,
    market.id,
    mappable.length,
    properties,
    ownerLinksByPropertyId,
    propertyUrgencyById,
    propertyListingPinById,
    pfByPropertyId,
    pricefinderMode,
    selectedPropertyId,
  ]);

  const mapSizeClass = fill ? "absolute inset-0 h-full w-full" : mapHeightClass;

  if (!apiKey) {
    return (
      <Card className={cn("flex items-center justify-center p-6 text-center", mapSizeClass, className)}>
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
    <div
      className={cn(
        "relative overflow-hidden bg-background",
        fill ? "h-full w-full" : "rounded-lg border border-border/80 bg-muted/20",
        className,
      )}
    >
      {mapError ? (
        <div className={cn("flex items-center justify-center p-4 text-sm text-destructive", mapSizeClass)}>
          {mapError}
        </div>
      ) : (
        <>
          {!mapReady ? (
            <div
              className={cn(
                "flex items-center justify-center gap-2 text-sm text-muted-foreground",
                fill ? "absolute inset-0" : mapSizeClass,
              )}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading map…
            </div>
          ) : null}
          <div
            ref={mapRef}
            className={cn(
              pinDropMode ? "cursor-crosshair" : "cursor-default",
              mapSizeClass,
              !mapReady && !fill && "absolute opacity-0 pointer-events-none h-0 min-h-0",
              !mapReady && fill && "invisible",
            )}
          />
        </>
      )}

      <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap gap-1.5">
        {needsGeocodeCount > 0 && onPlotAddresses ? (
          <Button
            size="sm"
            variant="secondary"
            className="pointer-events-auto h-8 text-xs shadow-md bg-background/95 backdrop-blur-sm"
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
        {enrichingPropertyId ? (
          <span className="pointer-events-auto inline-flex h-8 items-center rounded-md bg-background/95 px-2 text-[10px] text-muted-foreground backdrop-blur-sm">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Pricefinder…
          </span>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm">
          <span
            className="h-2.5 w-2.5 rounded-full border border-white"
            style={{
              backgroundColor: PIN_COLORS.prospect,
              boxShadow: `0 0 6px ${PROSPECT_PIN_GLOW}`,
            }}
          />
          Prospect
        </span>
        {(Object.keys(LISTING_PIN_COLORS) as Array<keyof typeof LISTING_PIN_COLORS>).map((kind) => (
          <span
            key={kind}
            className="inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm"
          >
            <span
              className="h-2.5 w-2.5 rounded-full border border-white"
              style={{
                backgroundColor: LISTING_PIN_COLORS[kind].fill,
                boxShadow: `0 0 6px ${LISTING_PIN_COLORS[kind].glow}`,
              }}
            />
            {LISTING_PIN_COLORS[kind].label}
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md bg-background/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm tabular-nums">
        {mappable.length} pinned · {properties.length} in suburb
        {pinDropMode ? " · drop pin mode" : ""}
      </div>

      {contextMenu ? (
        <div
          className="pointer-events-auto absolute z-30 min-w-[160px] rounded-md border border-border bg-background py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
            onClick={() => emitDraftPick(contextMenu.lat, contextMenu.lng)}
          >
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Add prospect here
          </button>
        </div>
      ) : null}
    </div>
  );
}
