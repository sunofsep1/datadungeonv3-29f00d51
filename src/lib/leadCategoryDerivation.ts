import type {
  JourneyStage,
  RelationshipCategory,
  TimeframeCategory,
  LeadTemperature,
  RoleCategory,
} from "@/lib/leadCategories";
import {
  isBuyerRole,
  isSellerRole,
  parseTimeframeCategory,
  parseJourneyStage,
  parseRoleCategory,
} from "@/lib/leadCategories";
import { listingKanbanColumnId } from "@/lib/listingKanbanStages";

/**
 * Primary nurture pack names — must match rows user created from starter packs
 * (`lib/starterNurtureSequences.ts` / Nurture page seed).
 */
const JOURNEY_SEQUENCE_NAMES: Record<JourneyStage, string[]> = {
  SELLER_LONG_TERM: ["Seller · Future seller — long nurture (24 months)"],
  SELLER_CONSIDERING: ["Seller · New client — appraisal & listing path (30 days)"],
  SELLER_PREP: ["Seller · New client — appraisal & listing path (30 days)"],
  SELLER_GO_LIVE_PREP: ["Seller · OTM — on-market intensive (90 days)"],
  SELLER_ON_MARKET: [
    "Seller · Listed with me — vendor updates & campaign rhythm (90 days)",
    "Seller · OTM — on-market intensive (90 days)",
  ],
  SELLER_ON_MARKET_OTHER_AGENT: [
    "Seller · OTM (other agent) — 60-day trust takeover",
    "Seller · Future seller — long nurture (24 months)",
  ],
  SELLER_NEGOTIATION: ["Seller · OTM — on-market intensive (90 days)"],
  SELLER_UNDER_CONTRACT_CONDITIONAL: ["Seller · Under contract to settlement (seller)"],
  SELLER_UNDER_CONTRACT_UNCONDITIONAL: ["Seller · Under contract to settlement (seller)"],
  SELLER_SETTLED_RECENT: ["Seller · Past client — relationship & referrals (12 months)"],
  SELLER_PAST_CLIENT: ["Seller · Past client — relationship & referrals (12 months)"],
  BUYER_LONG_TERM_AWARENESS: ["Buyer · Long nurture — no rush (24 months)"],
  BUYER_CONSIDERATION: ["Buyer · New enquiry — welcome & qualify (14 days)"],
  BUYER_PREPARATION: ["Buyer · First home — education & readiness (75 days)"],
  BUYER_ACTIVE_SEARCH: ["Buyer · Active search — inspections & offers (90 days)"],
  BUYER_NEGOTIATION: ["Buyer · Upsizing / growing family (90 days)"],
  BUYER_UNDER_CONTRACT_CONDITIONAL: [
    "Buyer · Under contract on my listing — conditions to settlement (120 days)",
    "Buyer · Relocating — interstate / long-distance (90 days)",
  ],
  BUYER_UNDER_CONTRACT_UNCONDITIONAL: [
    "Buyer · Under contract on my listing — conditions to settlement (120 days)",
    "Buyer · Relocating — interstate / long-distance (90 days)",
  ],
  BUYER_SETTLED_RECENT: ["Buyer · Past buyer — referrals & reviews (12 months)"],
  BUYER_PAST_CLIENT: ["Buyer · Past buyer — referrals & reviews (12 months)"],
};

const ROLE_FALLBACK_SEQUENCES: Partial<Record<RoleCategory, string[]>> = {
  BUYER_FIRST_HOME: ["Buyer · First home — education & readiness (75 days)"],
  BUYER_INVESTOR: ["Buyer · Investor / landlord — acquisition pipeline (120 days)"],
  LANDLORD: ["Buyer · Investor / landlord — acquisition pipeline (120 days)"],
  BUYER_UPGRADER: ["Buyer · Upsizing / growing family (90 days)"],
  BUYER_DOWNSIZER: ["Buyer · Downsizing purchase — buy smaller (90 days)"],
  TENANT: ["Buyer · Long nurture — no rush (24 months)"],
  PAST_CLIENT_BUYER: ["Buyer · Past buyer — referrals & reviews (12 months)"],
  PAST_CLIENT_SELLER: ["Seller · Past client — relationship & referrals (12 months)"],
  REFERRAL_PARTNER: [],
  SELLER_OWNER_OCCUPIER: ["Seller · New client — appraisal & listing path (30 days)"],
  SELLER_INVESTOR: ["Seller · New client — appraisal & listing path (30 days)"],
  SELLER_DISTRESSED: ["Seller · New client — appraisal & listing path (30 days)"],
};

export type DeriveLeadTemperatureInput = {
  timeframeCategory: TimeframeCategory;
  isBuyer: boolean;
  isSeller: boolean;
  hasPreapproval?: boolean;
  hasListingAgreement?: boolean;
  recentHighEngagement?: boolean;
  isArchived?: boolean;
};

/**
 * Infer lead temperature from timeframe + readiness signals.
 * Manual overrides are handled in the service layer (skips when meta says manual).
 */
export function deriveLeadTemperature(input: DeriveLeadTemperatureInput): LeadTemperature {
  if (input.isArchived) return "LEAD_ARCHIVED";

  const tf = input.timeframeCategory;

  const hotCommitment =
    tf === "TIMEFRAME_0_3_MONTHS" &&
    ((input.isBuyer && input.hasPreapproval) ||
      (input.isSeller && input.hasListingAgreement) ||
      input.recentHighEngagement);

  if (hotCommitment) return "LEAD_HOT";

  if (tf === "TIMEFRAME_0_3_MONTHS") return "LEAD_WARM";

  if (tf === "TIMEFRAME_3_6_MONTHS" || tf === "TIMEFRAME_6_12_MONTHS") {
    if (input.recentHighEngagement && tf === "TIMEFRAME_3_6_MONTHS") return "LEAD_HOT";
    return "LEAD_WARM";
  }

  if (
    tf === "TIMEFRAME_12_24_MONTHS" ||
    tf === "TIMEFRAME_24_PLUS_MONTHS" ||
    tf === "TIMEFRAME_UNKNOWN"
  ) {
    if (input.recentHighEngagement) return "LEAD_WARM";
    return "LEAD_COLD";
  }

  return "LEAD_COLD";
}

/** Appraisal / prep listings default to warm unless already hot or manually set elsewhere. */
export function leadTemperatureForListingPipelineStage(
  pipelineStage: string | null | undefined,
  derived: LeadTemperature,
): LeadTemperature {
  if (listingKanbanColumnId(pipelineStage) === "appraisal") {
    if (derived === "LEAD_HOT" || derived === "LEAD_ARCHIVED") return derived;
    return "LEAD_WARM";
  }
  return derived;
}

export type DefaultJourneyStageInput = {
  isBuyer: boolean;
  isSeller: boolean;
  timeframeCategory: TimeframeCategory;
  relationshipCategory: RelationshipCategory | null;
};

/** Suggested journey stage for a brand-new lead before pipeline mechanics apply. */
export function defaultJourneyStageForNewLead(input: DefaultJourneyStageInput): JourneyStage | null {
  if (input.isSeller) {
    if (input.timeframeCategory === "TIMEFRAME_0_3_MONTHS") return "SELLER_CONSIDERING";
    return "SELLER_LONG_TERM";
  }
  if (input.isBuyer) {
    if (input.relationshipCategory === "REL_NEW_ONLINE_LEAD") return "BUYER_LONG_TERM_AWARENESS";
    return "BUYER_CONSIDERATION";
  }
  return null;
}

/** Map listing / CRM pipeline slug to journey_stage (seller-weighted). */
export function mapListingPipelineStageToJourneyStage(
  pipelineStage: string | null | undefined
): JourneyStage | null {
  const s = (pipelineStage ?? "").toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, JourneyStage> = {
    appraisal: "SELLER_CONSIDERING",
    listing: "SELLER_ON_MARKET",
    under_contract: "SELLER_UNDER_CONTRACT_CONDITIONAL",
    unconditional: "SELLER_UNDER_CONTRACT_UNCONDITIONAL",
    settled: "SELLER_SETTLED_RECENT",
    past_client: "SELLER_PAST_CLIENT",
    new: "SELLER_CONSIDERING",
    prep: "SELLER_PREP",
    negotiation: "SELLER_NEGOTIATION",
  };
  return map[s] ?? null;
}

export type ClassificationForSequence = {
  journeyStage?: string | null;
  roleCategory?: string | null;
  leadTemperature?: string | null;
  doNotContact?: boolean | null;
};

/** Reasons auto-enroll stops before name matching (mutually exclusive, first wins). */
export type AutoEnrollPrecheckSkip = "do_not_contact" | "lead_archived" | "referral_partner";

/**
 * If non-null, {@link candidateSequenceNamesForClassification} yields no names for policy reasons
 * (not “missing journey/role”).
 */
export function autoEnrollPrecheckSkipReason(input: ClassificationForSequence): AutoEnrollPrecheckSkip | null {
  if (input.doNotContact) return "do_not_contact";
  if (input.leadTemperature === "LEAD_ARCHIVED") return "lead_archived";
  if (parseRoleCategory(input.roleCategory) === "REFERRAL_PARTNER") return "referral_partner";
  return null;
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const t = n?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Ordered candidate sequence **names** to match against `nurture_sequences.name` for auto-enrollment.
 */
export function candidateSequenceNamesForClassification(input: ClassificationForSequence): string[] {
  if (autoEnrollPrecheckSkipReason(input)) return [];

  const journey = parseJourneyStage(input.journeyStage);
  const role = parseRoleCategory(input.roleCategory);

  let names: string[] = [];
  if (journey) {
    names = [...(JOURNEY_SEQUENCE_NAMES[journey] ?? [])];
  } else if (role && ROLE_FALLBACK_SEQUENCES[role]) {
    names = [...(ROLE_FALLBACK_SEQUENCES[role] ?? [])];
  } else if (role && isBuyerRole(role)) {
    names = ["Buyer · New enquiry — welcome & qualify (14 days)"];
  } else if (role && isSellerRole(role)) {
    names = ["Seller · New client — appraisal & listing path (30 days)"];
  }

  /** Investor / landlord acquisition (buyer-stage journeys; LANDLORD role is seller-flavoured but may run buyer journeys in CRM). */
  const investorAcquisitionJourneys: JourneyStage[] = [
    "BUYER_PREPARATION",
    "BUYER_ACTIVE_SEARCH",
    "BUYER_CONSIDERATION",
    "BUYER_LONG_TERM_AWARENESS",
  ];
  if (
    journey &&
    investorAcquisitionJourneys.includes(journey) &&
    (role === "BUYER_INVESTOR" || role === "LANDLORD")
  ) {
    const investor = "Buyer · Investor / landlord — acquisition pipeline (120 days)";
    names = dedupeNames([investor, ...names.filter((n) => !n.includes("Investor / landlord"))]);
  }

  /** Role refinements (buyer). */
  if (role && isBuyerRole(role) && journey) {
    if (
      role === "BUYER_FIRST_HOME" &&
      ["BUYER_PREPARATION", "BUYER_CONSIDERATION", "BUYER_LONG_TERM_AWARENESS"].includes(journey)
    ) {
      const first = "Buyer · First home — education & readiness (75 days)";
      names = dedupeNames([first, ...names.filter((n) => !n.includes("First home"))]);
    }
    if (role === "BUYER_UPGRADER" && journey === "BUYER_ACTIVE_SEARCH") {
      const up = "Buyer · Upsizing / growing family (90 days)";
      names = dedupeNames([up, ...names]);
    }
    if (role === "BUYER_DOWNSIZER") {
      const down = "Buyer · Downsizing purchase — buy smaller (90 days)";
      names = dedupeNames([down, ...names]);
    }
  }

  /** Role refinements (seller). */
  if (role === "PAST_CLIENT_SELLER") {
    names = ["Seller · Past client — relationship & referrals (12 months)"];
  } else if ((role === "SELLER_INVESTOR" || role === "LANDLORD") && journey === "SELLER_ON_MARKET") {
    const tenanted = "Seller · Tenanted investment — listed for sale (60 days)";
    names = dedupeNames([tenanted, ...names.filter((n) => !n.includes("Tenanted investment"))]);
  }

  return dedupeNames(names);
}

/** UI hints (e.g. Classification panel). Matches auto-enroll when `roleCategory` is passed. */
export function suggestedSequenceNamesForJourneyStage(
  stage: JourneyStage | null,
  opts?: Pick<ClassificationForSequence, "leadTemperature" | "doNotContact" | "roleCategory">
): string[] {
  const roleCategory = opts?.roleCategory ?? null;
  if (
    autoEnrollPrecheckSkipReason({
      journeyStage: stage,
      roleCategory,
      leadTemperature: opts?.leadTemperature,
      doNotContact: opts?.doNotContact,
    })
  )
    return [];
  if (!stage && !roleCategory?.trim()) return [];
  return candidateSequenceNamesForClassification({
    journeyStage: stage,
    roleCategory,
    leadTemperature: opts?.leadTemperature,
    doNotContact: opts?.doNotContact,
  }).slice(0, 3);
}

export type ContactLike = {
  timeframe_category?: string | null;
  lead_temperature?: string | null;
  journey_stage?: string | null;
  role_category?: string | null;
  relationship_category?: string | null;
  classification_meta?: unknown;
  do_not_contact?: boolean | null;
  /** Heuristic: buying_budget_min/max set */
  buying_budget_min?: number | null;
  selling_intentions?: string | null;
};

/** Build derivation input from a stored contact row (+ optional hints). */
export function buildDeriveInputFromContact(
  row: ContactLike,
  hints?: { hasPreapproval?: boolean; hasListingAgreement?: boolean; recentHighEngagement?: boolean }
): DeriveLeadTemperatureInput {
  const role = row.role_category ?? null;
  const isBuyer = isBuyerRole(role);
  const isSeller = isSellerRole(role);
  const tf = parseTimeframeCategory(row.timeframe_category);
  const hasPreapproval =
    hints?.hasPreapproval ??
    (row.buying_budget_min != null && row.buying_budget_min > 0);
  const hasListingAgreement =
    hints?.hasListingAgreement ?? Boolean(row.selling_intentions?.trim());
  return {
    timeframeCategory: tf,
    isBuyer,
    isSeller,
    hasPreapproval,
    hasListingAgreement,
    recentHighEngagement: hints?.recentHighEngagement ?? false,
    isArchived: row.do_not_contact === true,
  };
}
