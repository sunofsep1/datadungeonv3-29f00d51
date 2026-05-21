import { listingSearchPrice, type ListingPriceSource } from "@/lib/listingPriceFields";

export type BuyerRequirementRecord = {
  id: string;
  contact_id: string;
  action?: string | null;
  property_type?: string | null;
  category?: string | null;
  state?: string | null;
  suburbs?: string[] | null;
  price_min?: number | null;
  price_max?: number | null;
  beds_min?: number | null;
  baths_min?: number | null;
  parking_min?: number | null;
  land_min_sqm?: number | null;
  land_max_sqm?: number | null;
  building_min_sqm?: number | null;
  building_max_sqm?: number | null;
  features_required?: string[] | null;
  notes?: string | null;
  /** Synthetic row from contact.preferred_suburbs / buying_budget */
  _source?: "profile" | "saved";
};

export type ListingMatchProfile = {
  suburb: string | null;
  state: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  property_type: string | null;
  land_sqm: number | null;
  building_sqm: number | null;
  features: string[];
};

export type BuyerMatchResult = {
  contactId: string;
  requirementId: string;
  requirementSource: "profile" | "saved";
  matchScore: number;
  matchReasons: string[];
};

export function normalizeSuburb(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parse suburb from a typical AU listing address line. */
export function parseSuburbFromAddress(address: string | null | undefined): string | null {
  if (!address?.trim()) return null;
  const s = address.trim();
  const statePost = s.match(/,\s*([^,]+?)\s+(QLD|NSW|VIC|WA|SA|TAS|ACT|NT)\s+\d{4}\s*$/i);
  if (statePost?.[1]) return statePost[1].trim();
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2];
    if (candidate && !/^\d+$/.test(candidate)) return candidate;
  }
  return null;
}

export function buildListingMatchProfile(
  listing: ListingPriceSource & {
    address?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    property_type?: string | null;
  },
  property?: {
    suburb?: string | null;
    city?: string | null;
    state?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    car_spaces?: number | null;
    property_type?: string | null;
    land_area_sqm?: number | null;
    floor_area_sqm?: number | null;
    features?: string[] | null;
  } | null,
): ListingMatchProfile {
  const suburb =
    property?.suburb?.trim() ||
    property?.city?.trim() ||
    parseSuburbFromAddress(listing.address ?? null) ||
    null;

  return {
    suburb,
    state: property?.state?.trim() || "QLD",
    price: listingSearchPrice(listing),
    bedrooms: listing.bedrooms ?? property?.bedrooms ?? null,
    bathrooms: listing.bathrooms ?? property?.bathrooms ?? null,
    parking: property?.car_spaces ?? null,
    property_type: listing.property_type ?? property?.property_type ?? null,
    land_sqm: property?.land_area_sqm ?? null,
    building_sqm: property?.floor_area_sqm ?? null,
    features: (property?.features ?? []).map((f) => f.toLowerCase()),
  };
}

function suburbMatches(listingSuburb: string | null, reqSuburbs: string[]): boolean {
  if (!reqSuburbs.length) return true;
  if (!listingSuburb) return false;
  const n = normalizeSuburb(listingSuburb);
  return reqSuburbs.some((s) => {
    const r = normalizeSuburb(s);
    return r === n || n.includes(r) || r.includes(n);
  });
}

function priceMatches(price: number | null, min?: number | null, max?: number | null): boolean {
  if (min == null && max == null) return true;
  if (price == null) return false;
  if (min != null && price < min) return false;
  if (max != null && price > max) return false;
  return true;
}

function minMet(actual: number | null, min?: number | null): boolean {
  if (min == null || min <= 0) return true;
  if (actual == null) return false;
  return actual >= min;
}

function rangeMet(actual: number | null, min?: number | null, max?: number | null): boolean {
  if (min == null && max == null) return true;
  if (actual == null) return false;
  if (min != null && actual < min) return false;
  if (max != null && actual > max) return false;
  return true;
}

function featuresMet(listingFeatures: string[], required: string[]): boolean {
  if (!required.length) return true;
  const set = new Set(listingFeatures.map((f) => f.toLowerCase()));
  return required.every((f) => set.has(f.trim().toLowerCase()));
}

function typeMatches(listingType: string | null, reqType: string | null | undefined): boolean {
  if (!reqType?.trim()) return true;
  if (!listingType?.trim()) return true;
  return normalizeSuburb(listingType) === normalizeSuburb(reqType);
}

export function requirementMatchesListing(
  req: BuyerRequirementRecord,
  listing: ListingMatchProfile,
): { matches: boolean; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const suburbs = (req.suburbs ?? []).filter(Boolean);
  if (suburbMatches(listing.suburb, suburbs)) {
    if (suburbs.length) {
      score += 30;
      reasons.push("Suburb");
    }
  } else {
    return { matches: false, score: 0, reasons: [] };
  }

  if (priceMatches(listing.price, req.price_min, req.price_max)) {
    if (req.price_min != null || req.price_max != null) {
      score += 25;
      reasons.push("Price");
    }
  } else {
    return { matches: false, score: 0, reasons: [] };
  }

  if (minMet(listing.bedrooms, req.beds_min)) {
    if (req.beds_min) {
      score += 15;
      reasons.push(`${req.beds_min}+ beds`);
    }
  } else {
    return { matches: false, score: 0, reasons: [] };
  }

  if (minMet(listing.bathrooms, req.baths_min)) {
    if (req.baths_min) {
      score += 10;
      reasons.push(`${req.baths_min}+ baths`);
    }
  } else {
    return { matches: false, score: 0, reasons: [] };
  }

  if (minMet(listing.parking, req.parking_min)) {
    if (req.parking_min) {
      score += 8;
      reasons.push(`${req.parking_min}+ parking`);
    }
  } else {
    return { matches: false, score: 0, reasons: [] };
  }

  if (rangeMet(listing.land_sqm, req.land_min_sqm, req.land_max_sqm)) {
    if (req.land_min_sqm != null || req.land_max_sqm != null) {
      score += 5;
      reasons.push("Land size");
    }
  } else {
    return { matches: false, score: 0, reasons: [] };
  }

  if (rangeMet(listing.building_sqm, req.building_min_sqm, req.building_max_sqm)) {
    if (req.building_min_sqm != null || req.building_max_sqm != null) {
      score += 5;
      reasons.push("Building size");
    }
  } else {
    return { matches: false, score: 0, reasons: [] };
  }

  const requiredFeatures = (req.features_required ?? []).filter(Boolean);
  if (featuresMet(listing.features, requiredFeatures)) {
    if (requiredFeatures.length) {
      score += 10;
      reasons.push("Features");
    }
  } else {
    return { matches: false, score: 0, reasons: [] };
  }

  if (typeMatches(listing.property_type, req.property_type)) {
    if (req.property_type?.trim()) {
      score += 5;
      reasons.push("Type");
    }
  } else {
    return { matches: false, score: 0, reasons: [] };
  }

  if (req.state?.trim() && listing.state?.trim()) {
    if (normalizeSuburb(req.state) !== normalizeSuburb(listing.state)) {
      return { matches: false, score: 0, reasons: [] };
    }
    score += 2;
  }

  if (reasons.length === 0) reasons.push("Open brief");
  score = Math.max(score, 10);

  return { matches: true, score, reasons };
}

export type ContactForMatching = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  do_not_contact?: boolean | null;
  preferred_suburbs?: string[] | null;
  buying_budget_min?: number | null;
  buying_budget_max?: number | null;
};

export function profileRequirementFromContact(contact: ContactForMatching): BuyerRequirementRecord | null {
  const suburbs = (contact.preferred_suburbs ?? []).filter(Boolean);
  const hasBudget =
    (contact.buying_budget_min != null && contact.buying_budget_min > 0) ||
    (contact.buying_budget_max != null && contact.buying_budget_max > 0);
  if (!suburbs.length && !hasBudget) return null;
  return {
    id: `profile:${contact.id}`,
    contact_id: contact.id,
    action: "buy",
    state: "QLD",
    suburbs,
    price_min: contact.buying_budget_min,
    price_max: contact.buying_budget_max,
    _source: "profile",
  };
}

export function matchBuyersToListing(
  listing: ListingMatchProfile,
  requirements: BuyerRequirementRecord[],
  contactsById: Map<string, ContactForMatching>,
): BuyerMatchResult[] {
  const bestByContact = new Map<string, BuyerMatchResult>();

  for (const req of requirements) {
    const contact = contactsById.get(req.contact_id);
    if (!contact || contact.do_not_contact) continue;

    const { matches, score, reasons } = requirementMatchesListing(req, listing);
    if (!matches) continue;

    const row: BuyerMatchResult = {
      contactId: req.contact_id,
      requirementId: req.id,
      requirementSource: req._source === "profile" ? "profile" : "saved",
      matchScore: score,
      matchReasons: reasons,
    };

    const prev = bestByContact.get(req.contact_id);
    if (!prev || row.matchScore > prev.matchScore) {
      bestByContact.set(req.contact_id, row);
    }
  }

  return Array.from(bestByContact.values()).sort((a, b) => b.matchScore - a.matchScore);
}

export type ListingMatchResult = {
  listingId: string;
  requirementId: string;
  matchScore: number;
  matchReasons: string[];
};

export type ListingForMatching = {
  id: string;
  address?: string | null;
  profile: ListingMatchProfile;
};

/** Reverse match: given a contact's requirements, return listings that satisfy at least one brief. */
export function matchListingsToRequirements(
  requirements: BuyerRequirementRecord[],
  listings: ListingForMatching[],
): ListingMatchResult[] {
  if (!requirements.length) return [];

  const results: ListingMatchResult[] = [];

  for (const listing of listings) {
    let best: ListingMatchResult | null = null;

    for (const req of requirements) {
      const { matches, score, reasons } = requirementMatchesListing(req, listing.profile);
      if (!matches) continue;

      const row: ListingMatchResult = {
        listingId: listing.id,
        requirementId: req.id,
        matchScore: score,
        matchReasons: reasons,
      };

      if (!best || row.matchScore > best.matchScore) {
        best = row;
      }
    }

    if (best) results.push(best);
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

export function formatRequirementSummary(req: BuyerRequirementRecord): string {
  const parts: string[] = [];
  const suburbs = (req.suburbs ?? []).filter(Boolean);
  if (suburbs.length) parts.push(suburbs.slice(0, 3).join(", ") + (suburbs.length > 3 ? "…" : ""));
  if (req.price_min != null || req.price_max != null) {
    const fmt = (n: number) =>
      new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
    if (req.price_min != null && req.price_max != null) parts.push(`${fmt(req.price_min)} – ${fmt(req.price_max)}`);
    else if (req.price_min != null) parts.push(`from ${fmt(req.price_min)}`);
    else if (req.price_max != null) parts.push(`up to ${fmt(req.price_max!)}`);
  }
  if (req.beds_min) parts.push(`${req.beds_min}+ bed`);
  if (req.baths_min) parts.push(`${req.baths_min}+ bath`);
  if (req.parking_min) parts.push(`${req.parking_min}+ car`);
  return parts.join(" · ") || "Open brief";
}
