import { normalizeSuburb, parseSuburbFromAddress } from "@/lib/buyerRequirementMatch";
import { buildContactUrgency, type ContactUrgencyTier } from "@/lib/contactUrgency";

/** Common AU suburb spelling variants for market ↔ property matching. */
const SUBURB_ALIASES: Record<string, string> = {
  "mt gravatt": "mount gravatt",
  "mt gravatt east": "mount gravatt east",
  "mt gravatt west": "mount gravatt west",
  "mt cotton": "mount cotton",
  "mt ommaney": "mount ommaney",
  "mt warren park": "mount warren park",
  "mt louisa": "mount louisa",
  "mt isa": "mount isa",
  "mt morgan": "mount morgan",
  "st lucia": "saint lucia",
  "st kilda": "saint kilda",
  "st ives": "saint ives",
};

/** Normalize suburb for market membership checks (aliases + casing). */
export function normalizeMarketSuburb(value: string | null | undefined): string {
  const base = normalizeSuburb(value);
  if (!base) return "";
  return SUBURB_ALIASES[base] ?? base;
}
import { getDaysSinceLastTouch, type ContactLikeForTouch } from "@/lib/contactLastTouch";

export type ContactMarket = {
  id: string;
  label: string;
  suburbs: string[];
  state?: string;
};

export type ContactMarketProperty = {
  suburb?: string | null;
  city?: string | null;
  state?: string | null;
  address_line1?: string | null;
  postcode?: string | null;
};

export type ContactMarketLink = {
  role?: string | null;
  properties?: ContactMarketProperty | null;
};

export type ContactForMarket = ContactLikeForTouch & {
  id?: string;
  contact_category?: string | null;
  next_touch_date?: string | null;
  contact_property_links?: ContactMarketLink[];
};

export type MarketStats = {
  market: ContactMarket;
  total: number;
  propertyCount: number;
  hotLeads: number;
  stale: number;
  noNextTouch: number;
  sampleAddresses: string[];
};

export type PropertyForMarket = ContactMarketProperty & {
  id?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function slugifyMarketId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "market";
}

export function isOwnerLinkRole(role?: string | null): boolean {
  const r = (role ?? "").trim().toLowerCase();
  if (!r) return true;
  return r === "owner";
}

export function getPropertySuburb(prop: ContactMarketProperty): string | null {
  const raw = prop.suburb ?? prop.city;
  if (raw?.trim()) return raw.trim();
  return parseSuburbFromAddress(prop.address_line1) ?? null;
}

function propertyStateMatches(prop: ContactMarketProperty, marketState?: string): boolean {
  const expected = (marketState ?? "").trim().toUpperCase();
  if (!expected) return true;
  const actual = (prop.state ?? "").trim().toUpperCase();
  if (!actual) return true;
  return actual === expected;
}

export function getOwnerPropertySuburbs(contact: ContactForMarket): string[] {
  const out = new Set<string>();
  for (const link of contact.contact_property_links ?? []) {
    if (!isOwnerLinkRole(link.role)) continue;
    const prop = link.properties;
    if (!prop) continue;
    const suburb = getPropertySuburb(prop);
    if (!suburb) continue;
    out.add(normalizeMarketSuburb(suburb));
  }
  return [...out];
}

export function marketSuburbSet(market: ContactMarket): Set<string> {
  return new Set(market.suburbs.map((s) => normalizeMarketSuburb(s)).filter(Boolean));
}

export function contactMatchesMarket(contact: ContactForMarket, market: ContactMarket): boolean {
  const suburbs = marketSuburbSet(market);
  if (suburbs.size === 0) return false;

  for (const link of contact.contact_property_links ?? []) {
    if (!isOwnerLinkRole(link.role)) continue;
    const prop = link.properties;
    if (!prop || !propertyMatchesMarket(prop, market)) continue;
    return true;
  }
  return false;
}

export function propertyMatchesMarket(prop: ContactMarketProperty, market: ContactMarket): boolean {
  const suburbs = marketSuburbSet(market);
  if (suburbs.size === 0) return false;
  if (!propertyStateMatches(prop, market.state)) return false;
  const suburb = getPropertySuburb(prop);
  if (!suburb) return false;
  return suburbs.has(normalizeMarketSuburb(suburb));
}

export function getPropertiesForMarket(properties: PropertyForMarket[], market: ContactMarket): PropertyForMarket[] {
  return properties.filter((p) => propertyMatchesMarket(p, market));
}

export function getOwnerContactsForMarket(contacts: ContactForMarket[], market: ContactMarket): ContactForMarket[] {
  return contacts.filter((c) => contactMatchesMarket(c, market));
}

function isHotLead(contact: ContactForMarket): boolean {
  return String(contact.contact_category ?? "")
    .trim()
    .toLowerCase() === "hot_lead";
}

function isStaleContact(contact: ContactForMarket): boolean {
  const days = getDaysSinceLastTouch(contact);
  return days != null && days > 30;
}

function formatPropertySample(prop: ContactMarketProperty): string {
  const parts = [prop.address_line1, getPropertySuburb(prop), prop.state, prop.postcode].filter(Boolean);
  return parts.join(", ") || "—";
}

export function buildMarketStats(
  contacts: ContactForMarket[],
  markets: ContactMarket[],
  properties: PropertyForMarket[] = [],
): MarketStats[] {
  return markets.map((market) => {
    const matched = getOwnerContactsForMarket(contacts, market);
    const marketProperties = getPropertiesForMarket(properties, market);
    const sampleAddresses: string[] = [];
    for (const c of matched) {
      for (const link of c.contact_property_links ?? []) {
        if (!isOwnerLinkRole(link.role) || !link.properties) continue;
        const prop = link.properties;
        if (!propertyStateMatches(prop, market.state)) continue;
        const suburb = getPropertySuburb(prop);
        if (!suburb || !marketSuburbSet(market).has(normalizeMarketSuburb(suburb))) continue;
        const line = formatPropertySample(prop);
        if (line !== "—" && !sampleAddresses.includes(line)) {
          sampleAddresses.push(line);
          if (sampleAddresses.length >= 3) break;
        }
      }
      if (sampleAddresses.length >= 3) break;
    }

    return {
      market,
      total: matched.length,
      propertyCount: marketProperties.length,
      hotLeads: matched.filter(isHotLead).length,
      stale: matched.filter(isStaleContact).length,
      noNextTouch: matched.filter((c) => !(c.next_touch_date ?? "").trim()).length,
      sampleAddresses,
    };
  });
}

export function findMarketById(markets: ContactMarket[], id: string | null | undefined): ContactMarket | null {
  if (!id?.trim()) return null;
  return markets.find((m) => m.id === id) ?? null;
}

/** Full 4-tier urgency for map pin colouring (aligns with ContactUrgencyTier). */
export type PropertyPinUrgency = ContactUrgencyTier; // "immediate" | "priority" | "planned" | "backlog"

const URGENCY_RANK: Record<PropertyPinUrgency, number> = {
  immediate: 4,
  priority: 3,
  planned: 2,
  backlog: 1,
};

/** Pin colour hint derived from linked owner urgency (highest tier wins). */
export function buildPropertyPinUrgencyMap(contacts: ContactForMarket[]): Record<string, PropertyPinUrgency> {
  const map: Record<string, PropertyPinUrgency> = {};
  for (const contact of contacts) {
    const result = buildContactUrgency({
      contactId: contact.id ?? "",
      manualTier: null,
      lastActivityAt: contact.last_activity_at ?? contact.last_touch_date ?? null,
      taskDueAts: contact.next_touch_date ? [contact.next_touch_date] : [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
    });
    const tier = result.tier;
    for (const link of contact.contact_property_links ?? []) {
      if (!isOwnerLinkRole(link.role)) continue;
      const propertyId = (link as Record<string, unknown>).property_id as string | undefined;
      if (!propertyId) continue;
      const existing = map[propertyId];
      if (!existing || URGENCY_RANK[tier] > URGENCY_RANK[existing]) {
        map[propertyId] = tier;
      }
    }
  }
  return map;
}

/** Last touch date (most recent across all linked owner contacts) keyed by property ID. */
export function buildPropertyLastTouchMap(contacts: ContactForMarket[]): Record<string, Date> {
  const map: Record<string, Date> = {};
  for (const contact of contacts) {
    const raw = contact.last_touch_date ?? contact.last_activity_at ?? null;
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    for (const link of contact.contact_property_links ?? []) {
      if (!isOwnerLinkRole(link.role)) continue;
      const propertyId = (link as Record<string, unknown>).property_id as string | undefined;
      if (!propertyId) continue;
      if (!map[propertyId] || d > map[propertyId]) map[propertyId] = d;
    }
  }
  return map;
}

/** Display copy for territory section headers. */
export function getMarketTerritoryHeading(market: ContactMarket, propertyCount: number, ownerCount: number) {
  const primarySuburb = market.suburbs[0]?.trim() || market.label;
  const state = market.state?.trim() || "QLD";
  const pinLine =
    propertyCount === 0
      ? "No pins yet — add properties with addresses in this suburb"
      : `${propertyCount} propert${propertyCount === 1 ? "y" : "ies"} on your map · ${ownerCount} linked owner${ownerCount === 1 ? "" : "s"}`;

  return {
    eyebrow: `${state} · Redlands patch`,
    title: primarySuburb,
    tagline: market.suburbs.length > 1 ? market.suburbs.join(" · ") : `Your ${primarySuburb} farm belt`,
    pinLine,
  };
}

export const DEFAULT_CONTACT_MARKETS: ContactMarket[] = [
  {
    id: "victoria-point",
    label: "Victoria Point home owners",
    suburbs: ["Victoria Point"],
    state: "QLD",
  },
  {
    id: "redland-bay",
    label: "Redland Bay home owners",
    suburbs: ["Redland Bay"],
    state: "QLD",
  },
  {
    id: "cleveland",
    label: "Cleveland home owners",
    suburbs: ["Cleveland"],
    state: "QLD",
  },
  {
    id: "thornlands",
    label: "Thornlands home owners",
    suburbs: ["Thornlands"],
    state: "QLD",
  },
  {
    id: "wellington-point",
    label: "Wellington Point home owners",
    suburbs: ["Wellington Point"],
    state: "QLD",
  },
];
