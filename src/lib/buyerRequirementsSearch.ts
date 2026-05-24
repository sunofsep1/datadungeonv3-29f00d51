import type { BuyerRequirementRecord } from "@/lib/buyerRequirementMatch";
import { normalizeSuburb } from "@/lib/buyerRequirementMatch";

export type RequirementsSearchCriteria = {
  action?: string | null;
  property_type?: string | null;
  state?: string | null;
  suburbs?: string[];
  price_min?: number | null;
  price_max?: number | null;
  beds_min?: number | null;
  baths_min?: number | null;
  parking_min?: number | null;
  land_min_sqm?: number | null;
  land_max_sqm?: number | null;
  building_min_sqm?: number | null;
  building_max_sqm?: number | null;
  features_required?: string[];
  /** Reapit "Limit search: exclude contacts missing criteria searched" */
  excludeMissingCriteria?: boolean;
};

export type RequirementCriterionKey =
  | "action"
  | "property_type"
  | "state"
  | "suburbs"
  | "price"
  | "beds"
  | "baths"
  | "parking"
  | "land"
  | "building"
  | "features";

export function activeRequirementCriteria(search: RequirementsSearchCriteria): RequirementCriterionKey[] {
  const keys: RequirementCriterionKey[] = [];
  if (search.action?.trim()) keys.push("action");
  if (search.property_type?.trim()) keys.push("property_type");
  if (search.state?.trim()) keys.push("state");
  if ((search.suburbs ?? []).filter(Boolean).length) keys.push("suburbs");
  if (search.price_min != null || search.price_max != null) keys.push("price");
  if (search.beds_min != null && search.beds_min > 0) keys.push("beds");
  if (search.baths_min != null && search.baths_min > 0) keys.push("baths");
  if (search.parking_min != null && search.parking_min > 0) keys.push("parking");
  if (search.land_min_sqm != null || search.land_max_sqm != null) keys.push("land");
  if (search.building_min_sqm != null || search.building_max_sqm != null) keys.push("building");
  if ((search.features_required ?? []).filter(Boolean).length) keys.push("features");
  return keys;
}

export function requirementHasCriterion(req: BuyerRequirementRecord, key: RequirementCriterionKey): boolean {
  switch (key) {
    case "action":
      return Boolean(req.action?.trim());
    case "property_type":
      return Boolean(req.property_type?.trim());
    case "state":
      return Boolean(req.state?.trim());
    case "suburbs":
      return (req.suburbs ?? []).some((s) => s.trim());
    case "price":
      return req.price_min != null || req.price_max != null;
    case "beds":
      return req.beds_min != null && req.beds_min > 0;
    case "baths":
      return req.baths_min != null && req.baths_min > 0;
    case "parking":
      return req.parking_min != null && req.parking_min > 0;
    case "land":
      return req.land_min_sqm != null || req.land_max_sqm != null;
    case "building":
      return req.building_min_sqm != null || req.building_max_sqm != null;
    case "features":
      return (req.features_required ?? []).some((f) => f.trim());
    default:
      return false;
  }
}

function suburbsOverlap(reqSuburbs: string[], searchSuburbs: string[]): boolean {
  const reqNorm = reqSuburbs.map((s) => normalizeSuburb(s)).filter(Boolean);
  const searchNorm = searchSuburbs.map((s) => normalizeSuburb(s)).filter(Boolean);
  return searchNorm.some((s) =>
    reqNorm.some((r) => r === s || r.includes(s) || s.includes(r)),
  );
}

function priceRangesOverlap(
  reqMin: number | null | undefined,
  reqMax: number | null | undefined,
  searchMin: number | null | undefined,
  searchMax: number | null | undefined,
): boolean {
  const rMin = reqMin ?? 0;
  const rMax = reqMax ?? Number.POSITIVE_INFINITY;
  const sMin = searchMin ?? 0;
  const sMax = searchMax ?? Number.POSITIVE_INFINITY;
  return rMin <= sMax && sMin <= rMax;
}

function rangeOverlaps(
  reqMin: number | null | undefined,
  reqMax: number | null | undefined,
  searchMin: number | null | undefined,
  searchMax: number | null | undefined,
): boolean {
  return priceRangesOverlap(reqMin, reqMax, searchMin, searchMax);
}

export function requirementMatchesSearch(
  req: BuyerRequirementRecord,
  search: RequirementsSearchCriteria,
): boolean {
  const active = activeRequirementCriteria(search);
  if (!active.length) return true;

  for (const key of active) {
    if (search.excludeMissingCriteria && !requirementHasCriterion(req, key)) {
      return false;
    }
    if (!criterionMatches(req, search, key)) return false;
  }
  return true;
}

function criterionMatches(
  req: BuyerRequirementRecord,
  search: RequirementsSearchCriteria,
  key: RequirementCriterionKey,
): boolean {
  switch (key) {
    case "action":
      return normalizeSuburb(req.action ?? "") === normalizeSuburb(search.action ?? "");
    case "property_type":
      return normalizeSuburb(req.property_type ?? "") === normalizeSuburb(search.property_type ?? "");
    case "state":
      return normalizeSuburb(req.state ?? "") === normalizeSuburb(search.state ?? "");
    case "suburbs":
      return suburbsOverlap(req.suburbs ?? [], search.suburbs ?? []);
    case "price":
      return priceRangesOverlap(req.price_min, req.price_max, search.price_min, search.price_max);
    case "beds":
      return (req.beds_min ?? 0) >= (search.beds_min ?? 0);
    case "baths":
      return (req.baths_min ?? 0) >= (search.baths_min ?? 0);
    case "parking":
      return (req.parking_min ?? 0) >= (search.parking_min ?? 0);
    case "land":
      return rangeOverlaps(req.land_min_sqm, req.land_max_sqm, search.land_min_sqm, search.land_max_sqm);
    case "building":
      return rangeOverlaps(
        req.building_min_sqm,
        req.building_max_sqm,
        search.building_min_sqm,
        search.building_max_sqm,
      );
    case "features": {
      const required = (search.features_required ?? []).map((f) => f.trim().toLowerCase()).filter(Boolean);
      const have = new Set((req.features_required ?? []).map((f) => f.trim().toLowerCase()));
      return required.every((f) => have.has(f));
    }
    default:
      return true;
  }
}

export type ContactRequirementSearchHit = {
  contactId: string;
  requirementId: string;
  requirementSource: "profile" | "saved";
};

export function findContactsByRequirementsSearch(
  requirements: BuyerRequirementRecord[],
  search: RequirementsSearchCriteria,
): ContactRequirementSearchHit[] {
  const active = activeRequirementCriteria(search);
  if (!active.length) return [];

  const hits: ContactRequirementSearchHit[] = [];
  const seen = new Set<string>();

  for (const req of requirements) {
    if (!requirementMatchesSearch(req, search)) continue;
    const key = `${req.contact_id}:${req.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      contactId: req.contact_id,
      requirementId: req.id,
      requirementSource: req._source === "profile" ? "profile" : "saved",
    });
  }
  return hits;
}
