import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ClassificationMeta, JourneyStage, RelationshipCategory, TimeframeCategory } from "@/lib/leadCategories";
import {
  parseClassificationMeta,
  parseJourneyStage,
  parseLeadTemperature,
  parseRelationshipCategory,
  parseTimeframeCategory,
} from "@/lib/leadCategories";
import {
  buildDeriveInputFromContact,
  deriveLeadTemperature,
  defaultJourneyStageForNewLead,
  leadTemperatureForListingPipelineStage,
  mapListingPipelineStageToJourneyStage,
  suggestedSequenceNamesForJourneyStage,
} from "@/lib/leadCategoryDerivation";
import { tryAutoEnrollNurtureForContact } from "@/lib/nurtureAutoEnroll";
export type DDClient = SupabaseClient<Database>;

function mergeMeta(prev: ClassificationMeta, patch: Partial<ClassificationMeta>): ClassificationMeta {
  return { ...prev, ...patch };
}

/** Guess relationship_category from free-text source (website, referral, etc.). */
export function inferRelationshipFromSource(source: string | null | undefined): RelationshipCategory | null {
  const s = (source ?? "").toLowerCase();
  if (!s.trim()) return null;
  if (/portal|website|online|facebook|instagram|realestate|domain|ad\b/i.test(s)) return "REL_NEW_ONLINE_LEAD";
  if (/open\s*home|inspection|home\s*open/i.test(s)) return "REL_OPEN_HOME_ATTENDEE";
  if (/referr.*client|word of mouth|friend/i.test(s)) return "REL_REFERRAL_FROM_CLIENT";
  if (/broker|solicitor|accountant|conveyanc|financial\s*planner|partner/i.test(s)) return "REL_REFERRAL_FROM_PARTNER";
  if (/sphere|family|friend|neighbor/i.test(s)) return "REL_SPHERE_OF_INFLUENCE";
  if (/signboard|sign|walk|called|phone|door/i.test(s)) return "REL_DIRECT_ENQUIRY";
  if (/past|return|again/i.test(s)) return "REL_PAST_CLIENT";
  if (/business|caf|shop|local/i.test(s)) return "REL_LOCAL_BUSINESS";
  return "REL_OTHER";
}

export type NewContactClassificationHints = {
  isBuyer?: boolean;
  isSeller?: boolean;
  timeframeCategory?: TimeframeCategory;
  relationshipCategory?: RelationshipCategory | null;
};

/** After insert: set defaults where columns are null + derive temperature. */
export async function applyClassificationDefaultsForNewContact(
  client: DDClient,
  contactId: string,
  hints?: NewContactClassificationHints
): Promise<void> {
  const { data: row, error: fetchErr } = await client.from("contacts").select("*").eq("id", contactId).single();
  if (fetchErr || !row) return;

  const rel =
    hints?.relationshipCategory ??
    inferRelationshipFromSource(row.source) ??
    parseRelationshipCategory(row.relationship_category);

  const tf = hints?.timeframeCategory ?? parseTimeframeCategory(row.timeframe_category);
  const meta = parseClassificationMeta(row.classification_meta);

  const isBuyer = hints?.isBuyer ?? false;
  const isSeller = hints?.isSeller ?? false;

  const journey =
    parseJourneyStage(row.journey_stage) ??
    defaultJourneyStageForNewLead({
      isBuyer,
      isSeller,
      timeframeCategory: tf,
      relationshipCategory: rel,
    });

  const deriveIn = buildDeriveInputFromContact(row as never, {});
  deriveIn.timeframeCategory = tf;
  deriveIn.isBuyer = isBuyer || deriveIn.isBuyer;
  deriveIn.isSeller = isSeller || deriveIn.isSeller;
  const derivedTemp =
    meta.lead_temperature?.source === "manual"
      ? parseLeadTemperature(row.lead_temperature)
      : deriveLeadTemperature(deriveIn);

  let nextMeta = mergeMeta(meta, { lead_temperature: { source: "derived" } });
  const updates: Record<string, unknown> = {
    timeframe_category: tf,
    lead_temperature: derivedTemp,
  };

  const existingCat = typeof row.contact_category === "string" ? row.contact_category.trim() : "";
  if (!existingCat) {
    updates.contact_category = "warm_lead";
  }

  if (rel && !row.relationship_category) {
    updates.relationship_category = rel;
    nextMeta = mergeMeta(nextMeta, { relationship_category: { source: "derived" } });
  }
  if (journey && !row.journey_stage) {
    updates.journey_stage = journey;
    nextMeta = mergeMeta(nextMeta, { journey_stage: { source: "derived" } });
  }
  updates.classification_meta = nextMeta;

  await client.from("contacts").update(updates as never).eq("id", contactId);

  const {
    data: { user },
  } = await client.auth.getUser();
  if (user) {
    const { data: rowAfter } = await client.from("contacts").select("*").eq("id", contactId).maybeSingle();
    if (rowAfter) {
      try {
        await tryAutoEnrollNurtureForContact(client, user.id, contactId, {
          journey_stage: rowAfter.journey_stage,
          role_category: rowAfter.role_category,
          lead_temperature: rowAfter.lead_temperature,
          do_not_contact: rowAfter.do_not_contact,
        });
      } catch {
        /* missing nurture tables / RLS */
      }
    }
  }
}

/** Recompute lead_temperature when missing or not manually locked. */
export async function recalculateLeadTemperatureForContact(
  client: DDClient,
  contactId: string,
  hints?: { hasPreapproval?: boolean; hasListingAgreement?: boolean; recentHighEngagement?: boolean }
): Promise<{ lead_temperature: string } | null> {
  const { data: row, error } = await client.from("contacts").select("*").eq("id", contactId).single();
  if (error || !row) return null;

  const merged = { ...(row as Record<string, unknown>), ...hints } as never;
  const meta = parseClassificationMeta(row.classification_meta);
  if (meta.lead_temperature?.source === "manual") {
    return { lead_temperature: row.lead_temperature ?? "LEAD_COLD" };
  }

  const derived = deriveLeadTemperature(buildDeriveInputFromContact(merged, hints));
  const nextMeta = mergeMeta(meta, {
    lead_temperature: { source: "derived" },
  });

  const { error: upErr } = await client
    .from("contacts")
    .update({
      lead_temperature: derived,
      classification_meta: nextMeta as never,
    } as never)
    .eq("id", contactId);
  if (upErr) throw upErr;
  return { lead_temperature: derived };
}

/** User clicked “Recalculate” — force temperature back to derived. */
export async function recalculateLeadTemperatureForced(client: DDClient, contactId: string): Promise<void> {
  const { data: row, error } = await client.from("contacts").select("*").eq("id", contactId).single();
  if (error || !row) return;
  const meta = parseClassificationMeta(row.classification_meta);
  const nextMeta = mergeMeta(meta, { lead_temperature: { source: "derived" } });
  const derived = deriveLeadTemperature(buildDeriveInputFromContact(row as never, {}));
  await client
    .from("contacts")
    .update({
      lead_temperature: derived,
      classification_meta: nextMeta as never,
    } as never)
    .eq("id", contactId);
}

/** Listing record: same temperature derivation as contacts (no do_not_contact on listing). */
export async function recalculateLeadTemperatureForcedListing(client: DDClient, listingId: string): Promise<void> {
  const { data: row, error } = await client.from("listings").select("*").eq("id", listingId).single();
  if (error || !row) return;
  const meta = parseClassificationMeta(row.classification_meta);
  const nextMeta = mergeMeta(meta, { lead_temperature: { source: "derived" } });
  const wrapped = { ...row, do_not_contact: false };
  const derived = deriveLeadTemperature(buildDeriveInputFromContact(wrapped as never, {}));
  await client
    .from("listings")
    .update({
      lead_temperature: derived,
      classification_meta: nextMeta as never,
    } as never)
    .eq("id", listingId);
}

export type DealChangeMetadata = {
  hasPreapproval?: boolean;
  hasListingAgreement?: boolean;
  recentHighEngagement?: boolean;
  /** When pipeline moves, map to journey_stage */
  listingPipelineStage?: string | null;
  primaryContactId?: string | null;
};

/**
 * Listing (pipeline “deal”) stage changed: sync journey_stage on listing (+ optional primary contact),
 * then may auto-enrol the linked contact into a matching nurture pack when classification maps to one.
 */
export async function updateLeadCategoriesFromDealChange(
  client: DDClient,
  listingId: string,
  newPipelineStage: string | null | undefined,
  metadata?: DealChangeMetadata
): Promise<{ journeyStage: JourneyStage | null; suggestedSequences: string[] }> {
  const journey = mapListingPipelineStageToJourneyStage(newPipelineStage);
  const suggested = suggestedSequenceNamesForJourneyStage(journey);

  const { data: listing, error } = await client.from("listings").select("*").eq("id", listingId).single();
  if (error || !listing) return { journeyStage: journey, suggestedSequences: suggested };

  const meta = parseClassificationMeta(listing.classification_meta);
  const updates: Record<string, unknown> = {
    classification_meta: meta as never,
  };

  if (journey && meta.journey_stage?.source !== "manual") {
    updates.journey_stage = journey;
    updates.classification_meta = mergeMeta(meta, { journey_stage: { source: "derived" } });
  }

  const rowForDerive = {
    ...listing,
    timeframe_category: listing.timeframe_category,
    role_category: listing.role_category,
    do_not_contact: false,
  };
  const deriveIn = buildDeriveInputFromContact(rowForDerive as never, {
    hasPreapproval: metadata?.hasPreapproval,
    hasListingAgreement: metadata?.hasListingAgreement,
    recentHighEngagement: metadata?.recentHighEngagement,
  });
  if (meta.lead_temperature?.source !== "manual") {
    const derived = deriveLeadTemperature(deriveIn);
    const t = leadTemperatureForListingPipelineStage(newPipelineStage, derived);
    updates.lead_temperature = t;
    updates.classification_meta = mergeMeta(updates.classification_meta as ClassificationMeta, {
      lead_temperature: { source: "derived" },
    });
  }

  await client.from("listings").update(updates as never).eq("id", listingId);

  const contactId = metadata?.primaryContactId ?? listing.contact_id;
  if (contactId && journey) {
    // Use * — selecting unknown columns (e.g. before migration) yields PostgREST 400.
    const { data: c } = await client.from("contacts").select("*").eq("id", contactId).maybeSingle();
    const cmeta = parseClassificationMeta(c?.classification_meta);
    if (c && cmeta.journey_stage?.source !== "manual") {
      await client
        .from("contacts")
        .update({
          journey_stage: journey,
          classification_meta: mergeMeta(cmeta, { journey_stage: { source: "derived" } }) as never,
        } as never)
        .eq("id", contactId);
    }
    await recalculateLeadTemperatureForContact(client, contactId, {
      hasListingAgreement: metadata?.hasListingAgreement,
      recentHighEngagement: metadata?.recentHighEngagement,
    });

    const {
      data: { user },
    } = await client.auth.getUser();
    if (user) {
      const { data: rowAfter } = await client.from("contacts").select("*").eq("id", contactId).maybeSingle();
      if (rowAfter) {
        try {
          await tryAutoEnrollNurtureForContact(client, user.id, contactId, {
            journey_stage: rowAfter.journey_stage,
            role_category: rowAfter.role_category,
            lead_temperature: rowAfter.lead_temperature,
            do_not_contact: rowAfter.do_not_contact,
          });
        } catch {
          /* nurture not available */
        }
      }
    }
  }

  return { journeyStage: journey, suggestedSequences: suggested };
}

/** @deprecated Use updateLeadCategoriesFromDealChange — kept for naming clarity with CRM “deals”. */
export const updateLeadCategoriesFromListingChange = updateLeadCategoriesFromDealChange;
