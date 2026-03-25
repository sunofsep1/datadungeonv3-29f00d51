/**
 * Prospect classification — canonical values aligned with DB CHECK constraints.
 * @see supabase/migrations/20260325120000_lead_classification.sql
 */

export const ROLE_CATEGORIES = [
  "SELLER_OWNER_OCCUPIER",
  "SELLER_INVESTOR",
  "SELLER_DISTRESSED",
  "BUYER_FIRST_HOME",
  "BUYER_UPGRADER",
  "BUYER_DOWNSIZER",
  "BUYER_INVESTOR",
  "LANDLORD",
  "TENANT",
  "REFERRAL_PARTNER",
  "PAST_CLIENT_SELLER",
  "PAST_CLIENT_BUYER",
] as const;
export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export const TIMEFRAME_CATEGORIES = [
  "TIMEFRAME_0_3_MONTHS",
  "TIMEFRAME_3_6_MONTHS",
  "TIMEFRAME_6_12_MONTHS",
  "TIMEFRAME_12_24_MONTHS",
  "TIMEFRAME_24_PLUS_MONTHS",
  "TIMEFRAME_UNKNOWN",
] as const;
export type TimeframeCategory = (typeof TIMEFRAME_CATEGORIES)[number];

export const LEAD_TEMPERATURES = ["LEAD_HOT", "LEAD_WARM", "LEAD_COLD", "LEAD_ARCHIVED"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

export const JOURNEY_STAGES = [
  "SELLER_LONG_TERM",
  "SELLER_CONSIDERING",
  "SELLER_PREP",
  "SELLER_GO_LIVE_PREP",
  "SELLER_ON_MARKET",
  "SELLER_ON_MARKET_OTHER_AGENT",
  "SELLER_NEGOTIATION",
  "SELLER_UNDER_CONTRACT_CONDITIONAL",
  "SELLER_UNDER_CONTRACT_UNCONDITIONAL",
  "SELLER_SETTLED_RECENT",
  "SELLER_PAST_CLIENT",
  "BUYER_LONG_TERM_AWARENESS",
  "BUYER_CONSIDERATION",
  "BUYER_PREPARATION",
  "BUYER_ACTIVE_SEARCH",
  "BUYER_NEGOTIATION",
  "BUYER_UNDER_CONTRACT_CONDITIONAL",
  "BUYER_UNDER_CONTRACT_UNCONDITIONAL",
  "BUYER_SETTLED_RECENT",
  "BUYER_PAST_CLIENT",
] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const RELATIONSHIP_CATEGORIES = [
  "REL_NEW_ONLINE_LEAD",
  "REL_OPEN_HOME_ATTENDEE",
  "REL_DIRECT_ENQUIRY",
  "REL_PAST_CLIENT",
  "REL_SPHERE_OF_INFLUENCE",
  "REL_REFERRAL_FROM_CLIENT",
  "REL_REFERRAL_FROM_PARTNER",
  "REL_LOCAL_BUSINESS",
  "REL_OTHER",
] as const;
export type RelationshipCategory = (typeof RELATIONSHIP_CATEGORIES)[number];

export type ClassificationFieldKey =
  | "role_category"
  | "timeframe_category"
  | "lead_temperature"
  | "journey_stage"
  | "relationship_category";

export type ClassificationFieldSource = "derived" | "manual";

export type ClassificationMeta = {
  lead_temperature?: { source: ClassificationFieldSource };
  timeframe_category?: { source: ClassificationFieldSource };
  journey_stage?: { source: ClassificationFieldSource };
  role_category?: { source: ClassificationFieldSource };
  relationship_category?: { source: ClassificationFieldSource };
};

export const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  SELLER_OWNER_OCCUPIER: "Seller — owner-occupier",
  SELLER_INVESTOR: "Seller — investor",
  SELLER_DISTRESSED: "Seller — distressed / urgent",
  BUYER_FIRST_HOME: "Buyer — first home",
  BUYER_UPGRADER: "Buyer — upsizer",
  BUYER_DOWNSIZER: "Buyer — downsizer",
  BUYER_INVESTOR: "Buyer — investor",
  LANDLORD: "Landlord",
  TENANT: "Tenant",
  REFERRAL_PARTNER: "Referral partner",
  PAST_CLIENT_SELLER: "Past client — sold with you",
  PAST_CLIENT_BUYER: "Past client — bought with you",
};

export const TIMEFRAME_LABELS: Record<TimeframeCategory, string> = {
  TIMEFRAME_0_3_MONTHS: "0–3 months",
  TIMEFRAME_3_6_MONTHS: "3–6 months",
  TIMEFRAME_6_12_MONTHS: "6–12 months",
  TIMEFRAME_12_24_MONTHS: "12–24 months",
  TIMEFRAME_24_PLUS_MONTHS: "24+ months / someday",
  TIMEFRAME_UNKNOWN: "Unknown",
};

export const LEAD_TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  LEAD_HOT: "Hot",
  LEAD_WARM: "Warm",
  LEAD_COLD: "Cold",
  LEAD_ARCHIVED: "Archived",
};

export const JOURNEY_STAGE_LABELS: Record<JourneyStage, string> = {
  SELLER_LONG_TERM: "Seller — long-term nurture",
  SELLER_CONSIDERING: "Seller — considering / research",
  SELLER_PREP: "Seller — pre-list prep",
  SELLER_GO_LIVE_PREP: "Seller — go-live prep",
  SELLER_ON_MARKET: "Seller — on market (you)",
  SELLER_ON_MARKET_OTHER_AGENT: "Seller — on market (other agent)",
  SELLER_NEGOTIATION: "Seller — negotiation",
  SELLER_UNDER_CONTRACT_CONDITIONAL: "Seller — under contract (conditional)",
  SELLER_UNDER_CONTRACT_UNCONDITIONAL: "Seller — under contract (unconditional)",
  SELLER_SETTLED_RECENT: "Seller — settled recently",
  SELLER_PAST_CLIENT: "Seller — past client",
  BUYER_LONG_TERM_AWARENESS: "Buyer — long-term awareness",
  BUYER_CONSIDERATION: "Buyer — consideration",
  BUYER_PREPARATION: "Buyer — preparation (finance)",
  BUYER_ACTIVE_SEARCH: "Buyer — active search",
  BUYER_NEGOTIATION: "Buyer — negotiation",
  BUYER_UNDER_CONTRACT_CONDITIONAL: "Buyer — under contract (conditional)",
  BUYER_UNDER_CONTRACT_UNCONDITIONAL: "Buyer — under contract (unconditional)",
  BUYER_SETTLED_RECENT: "Buyer — settled recently",
  BUYER_PAST_CLIENT: "Buyer — past client",
};

export const RELATIONSHIP_LABELS: Record<RelationshipCategory, string> = {
  REL_NEW_ONLINE_LEAD: "New — online / ads",
  REL_OPEN_HOME_ATTENDEE: "Open home attendee",
  REL_DIRECT_ENQUIRY: "Direct enquiry",
  REL_PAST_CLIENT: "Past client",
  REL_SPHERE_OF_INFLUENCE: "Sphere / personal network",
  REL_REFERRAL_FROM_CLIENT: "Referral — client",
  REL_REFERRAL_FROM_PARTNER: "Referral — partner (broker, solicitor…)",
  REL_LOCAL_BUSINESS: "Local business",
  REL_OTHER: "Other",
};

export function parseRoleCategory(v: string | null | undefined): RoleCategory | null {
  if (!v) return null;
  return (ROLE_CATEGORIES as readonly string[]).includes(v) ? (v as RoleCategory) : null;
}

export function parseTimeframeCategory(v: string | null | undefined): TimeframeCategory {
  if (v && (TIMEFRAME_CATEGORIES as readonly string[]).includes(v)) return v as TimeframeCategory;
  return "TIMEFRAME_UNKNOWN";
}

export function parseLeadTemperature(v: string | null | undefined): LeadTemperature {
  if (v && (LEAD_TEMPERATURES as readonly string[]).includes(v)) return v as LeadTemperature;
  return "LEAD_COLD";
}

export function parseJourneyStage(v: string | null | undefined): JourneyStage | null {
  if (!v) return null;
  return (JOURNEY_STAGES as readonly string[]).includes(v) ? (v as JourneyStage) : null;
}

export function parseRelationshipCategory(v: string | null | undefined): RelationshipCategory | null {
  if (!v) return null;
  return (RELATIONSHIP_CATEGORIES as readonly string[]).includes(v) ? (v as RelationshipCategory) : null;
}

export function parseClassificationMeta(raw: unknown): ClassificationMeta {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: ClassificationMeta = {};
  for (const key of [
    "lead_temperature",
    "timeframe_category",
    "journey_stage",
    "role_category",
    "relationship_category",
  ] as const) {
    const v = o[key];
    if (v && typeof v === "object" && v !== null && "source" in v) {
      const s = (v as { source: unknown }).source;
      if (s === "derived" || s === "manual") out[key] = { source: s };
    }
  }
  return out;
}

export function isSellerRole(role: RoleCategory | null): boolean {
  if (!role) return false;
  return (
    role.startsWith("SELLER_") || role === "PAST_CLIENT_SELLER" || role === "LANDLORD"
  );
}

export function isBuyerRole(role: RoleCategory | null): boolean {
  if (!role) return false;
  return role.startsWith("BUYER_") || role === "PAST_CLIENT_BUYER" || role === "TENANT";
}
