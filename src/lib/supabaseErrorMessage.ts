/** Supabase / PostgREST errors are often plain objects, not `Error`. */
export function supabaseErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || "Request failed";
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const parts = [o.message, o.details, o.hint].filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0
    );
    if (parts.length) return parts.join(" — ");
    if (typeof o.code === "string" && o.code) return `Error code: ${o.code}`;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

/**
 * Columns the app may send on `listings` insert that older DBs / schema caches may not have yet.
 * When PostgREST reports one as missing, we omit it and retry (see useCreateListing).
 */
export const LISTING_INSERT_STRIPPABLE_COLUMN_NAMES = [
  "property_id",
  "listing_image_url",
  "contract_finance_days",
  "contract_building_pest_days",
  "contract_due_diligence_days",
  "contract_subject_sale_days",
  "contract_body_corporate_days",
  "contact_id",
  "role_category",
  "timeframe_category",
  "lead_temperature",
  "journey_stage",
  "relationship_category",
  "classification_meta",
  "pipeline_stage",
  "status",
  "notes",
  "property_type",
  "bedrooms",
  "bathrooms",
  "campaign_enquiry_count",
  "campaign_last_enquiry_at",
  "campaign_inspection_count",
  "campaign_next_inspection_at",
  "campaign_offers_count",
  "campaign_buyer_matches_count",
  "campaign_start_at",
  "search_price",
  "display_price",
  "search_price_min",
  "search_price_max",
  "marketing_headline",
  "marketing_description",
  "feature_flags",
  "address_display_mode",
  "hide_address_portal",
] as const;

/** Parse PostgREST / Postgres "column missing on listings" messages. */
export function parseMissingListingsTableColumn(err: unknown): string | null {
  const parts: string[] = [];
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    for (const k of ["message", "details", "hint"]) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) parts.push(v);
    }
  }
  const s = [supabaseErrorMessage(err), ...parts].join("\n");

  const strict = [
    /Could not find the ['"]([^'"]+)['"] column of ['"]listings['"]/i,
    /column ['"]([^'"]+)['"] of relation ['"]listings['"] does not exist/i,
  ];
  for (const p of strict) {
    const m = s.match(p);
    if (m?.[1]) return m[1];
  }
  // Only if the message references listings (avoid matching other tables' "column x does not exist")
  if (s.toLowerCase().includes("listings")) {
    const m = s.match(/column ['"]([^'"]+)['"] does not exist/i);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** e.g. contact_id FK to contacts — allow insert without link when contact row isn't visible to RLS. */
export function isListingsContactForeignKeyError(err: unknown): boolean {
  const s = supabaseErrorMessage(err).toLowerCase();
  return (
    (s.includes("foreign key") || s.includes("violates foreign key")) &&
    (s.includes("contact_id") || s.includes("listings_contact_id") || s.includes('"contacts"'))
  );
}

/** property_id FK to properties — strip link + hero URL and retry (stale id, wrong env, or visibility). */
export function isListingsPropertyForeignKeyError(err: unknown): boolean {
  const s = supabaseErrorMessage(err).toLowerCase();
  return (
    (s.includes("foreign key") || s.includes("violates foreign key")) &&
    (s.includes("property_id") || s.includes("listings_property_id") || s.includes('"properties"'))
  );
}

/** DB still on legacy listings_pipeline_stage_check (no `unconditional`, etc.). */
export function isListingsPipelineStageCheckError(err: unknown): boolean {
  const s = supabaseErrorMessage(err).toLowerCase();
  return (
    s.includes("listings_pipeline_stage_check") ||
    (s.includes("violates check constraint") && s.includes("pipeline_stage"))
  );
}

/**
 * Map app kanban slug → slug allowed by older pipeline_stage CHECK constraints.
 * Used only after a check-constraint failure on insert (until migration is applied).
 */
export const LISTING_PIPELINE_STAGE_LEGACY_FALLBACK: Record<string, string> = {
  unconditional: "under_contract",
  negotiation: "listing",
  prep: "appraisal",
  new: "appraisal",
};
