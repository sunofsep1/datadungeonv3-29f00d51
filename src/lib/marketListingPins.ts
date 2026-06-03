import { normalizeSuburb, parseSuburbFromAddress } from "@/lib/buyerRequirementMatch";
import {
  marketSuburbSet,
  propertyMatchesMarket,
  type ContactMarket,
  type PropertyForMarket,
} from "@/lib/contactMarkets";
import { listingKanbanColumnId, LISTING_PIPELINE_STAGE_OPTIONS } from "@/lib/listingKanbanStages";

/** CRM stock pin on My Markets map — takes priority over owner urgency colours. */
export type PropertyListingPinKind = "appraisal" | "listing" | "sale";

export type PropertyListingPinMeta = {
  kind: PropertyListingPinKind;
  listingId: string;
  stageLabel: string;
  address: string;
};

export type ListingForMarketPin = {
  id: string;
  address: string;
  property_id?: string | null;
  pipeline_stage?: string | null;
  status?: string | null;
  hidden_listing?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const PIN_KIND_PRIORITY: Record<PropertyListingPinKind, number> = {
  sale: 3,
  listing: 2,
  appraisal: 1,
};

export const LISTING_PIN_COLORS: Record<
  PropertyListingPinKind,
  { fill: string; glow: string; label: string }
> = {
  appraisal: { fill: "#F59E0B", glow: "rgba(245, 158, 11, 0.75)", label: "Appraisal" },
  listing: { fill: "#22C55E", glow: "rgba(34, 197, 94, 0.75)", label: "Listing" },
  sale: { fill: "#9F1239", glow: "rgba(159, 18, 57, 0.75)", label: "Sale" },
};

function pipelineStageLabel(stage: string | null | undefined): string {
  const col = listingKanbanColumnId(stage);
  return LISTING_PIPELINE_STAGE_OPTIONS.find((o) => o.id === col)?.label ?? "Appraisal / prep";
}

/** Classify a CRM listing for map pin colour. */
export function listingPinKind(listing: {
  pipeline_stage?: string | null;
  status?: string | null;
}): PropertyListingPinKind {
  const status = (listing.status ?? "").trim().toLowerCase();
  const col = listingKanbanColumnId(listing.pipeline_stage);

  if (status === "sold" || col === "settled" || col === "past_client") return "sale";
  if (col === "listing" || col === "under_contract" || col === "unconditional") return "listing";
  return "appraisal";
}

function listingTimestamp(listing: ListingForMarketPin): number {
  const raw = listing.updated_at ?? listing.created_at;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function shouldPinListing(listing: ListingForMarketPin): boolean {
  if (listing.hidden_listing) return false;
  const status = (listing.status ?? "").trim().toLowerCase();
  if (status === "withdrawn") return false;
  return Boolean(listing.address?.trim());
}

function suburbFromListingAddress(address: string | null | undefined): string | null {
  if (!address?.trim()) return null;
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const stateTail = last.match(/^(.+?)\s+(QLD|NSW|VIC|WA|SA|TAS|ACT|NT)$/i);
  if (stateTail?.[1]) return stateTail[1].trim();

  const parsed = parseSuburbFromAddress(address);
  if (parsed && !/^\d/.test(parsed)) return parsed;
  return null;
}

function listingMatchesMarket(
  listing: ListingForMarketPin,
  propertyById: Map<string, PropertyForMarket & { id: string }>,
  market: ContactMarket,
): boolean {
  if (listing.property_id) {
    const prop = propertyById.get(listing.property_id);
    if (prop && propertyMatchesMarket(prop, market)) return true;
  }
  const suburb = suburbFromListingAddress(listing.address);
  if (!suburb) return false;
  return marketSuburbSet(market).has(normalizeSuburb(suburb));
}

function propertyFromListing(
  listing: ListingForMarketPin,
  propertyById: Map<string, PropertyForMarket & { id: string }>,
  market: ContactMarket,
): (PropertyForMarket & { id: string }) | null {
  if (listing.property_id) {
    const linked = propertyById.get(listing.property_id);
    if (linked) return linked;
  }

  const suburb = suburbFromListingAddress(listing.address);
  const prop: PropertyForMarket & { id: string } = {
    id: listing.property_id ?? `listing:${listing.id}`,
    address_line1: listing.address,
    suburb,
    city: suburb,
    state: market.state ?? "QLD",
    latitude: null,
    longitude: null,
  };

  if (!propertyMatchesMarket(prop, market)) {
    if (!suburb || !marketSuburbSet(market).has(normalizeSuburb(suburb))) return null;
  }

  return prop;
}

export type MarketListingPinResult = {
  pinByPropertyId: Record<string, PropertyListingPinMeta>;
  /** Properties from listings that are not already in the market owner set. */
  extraProperties: Array<PropertyForMarket & { id: string }>;
};

/**
 * Build glowing CRM stock pins for a market suburb and any listing-only addresses to plot.
 */
export function buildMarketListingPinData(
  listings: ListingForMarketPin[],
  allProperties: Array<PropertyForMarket & { id: string }>,
  market: ContactMarket | null | undefined,
): MarketListingPinResult {
  const pinByPropertyId: Record<string, PropertyListingPinMeta> = {};
  const extraProperties: Array<PropertyForMarket & { id: string }> = [];
  const extraIds = new Set<string>();

  if (!market) {
    return { pinByPropertyId, extraProperties };
  }

  const propertyById = new Map(allProperties.map((p) => [p.id, p]));
  const marketPropertyIds = new Set(
    allProperties.filter((p) => propertyMatchesMarket(p, market)).map((p) => p.id),
  );

  const pinTsByPropertyId = new Map<string, number>();

  for (const listing of listings) {
    if (!shouldPinListing(listing)) continue;
    if (!listingMatchesMarket(listing, propertyById, market)) continue;

    const prop = propertyFromListing(listing, propertyById, market);
    if (!prop) continue;

    const pinId = prop.id;
    const kind = listingPinKind(listing);
    const meta: PropertyListingPinMeta = {
      kind,
      listingId: listing.id,
      stageLabel: pipelineStageLabel(listing.pipeline_stage),
      address: listing.address,
    };
    const ts = listingTimestamp(listing);

    const existing = pinByPropertyId[pinId];
    const existingTs = pinTsByPropertyId.get(pinId) ?? 0;
    if (
      !existing ||
      PIN_KIND_PRIORITY[kind] > PIN_KIND_PRIORITY[existing.kind] ||
      (PIN_KIND_PRIORITY[kind] === PIN_KIND_PRIORITY[existing.kind] && ts > existingTs)
    ) {
      pinByPropertyId[pinId] = meta;
      pinTsByPropertyId.set(pinId, ts);
    }

    if (!marketPropertyIds.has(pinId) && !extraIds.has(pinId)) {
      extraIds.add(pinId);
      extraProperties.push(prop);
    }
  }

  return { pinByPropertyId, extraProperties };
}

/** Synthetic map property id from a listing-only pin (no CRM property row). */
export function listingIdFromMapPropertyId(propertyId: string): string | null {
  if (!propertyId.startsWith("listing:")) return null;
  return propertyId.slice("listing:".length) || null;
}
