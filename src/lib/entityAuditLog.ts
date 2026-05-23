import type { SupabaseClient } from "@supabase/supabase-js";

const TRACKED_LISTING_FIELDS: Record<string, string> = {
  address: "Address",
  pipeline_stage: "Pipeline stage",
  status: "Status",
  price: "Price",
  search_price: "Search price",
  display_price: "Display price",
  search_price_min: "Search range min",
  search_price_max: "Search range max",
  marketing_headline: "Headline",
  marketing_description: "Description",
  feature_flags: "Features",
  key_date_listed: "Listed date",
  key_date_agency_expiry: "Agency expiry",
  key_date_settlement: "Settlement date",
  address_display_mode: "Address display",
  hide_address_portal: "Hide address on portals",
  for_sale_or_lease: "For sale / lease",
  sale_method: "Sale method",
  authority_type: "Authority",
  listed_as_auction: "Listed as auction",
  off_market: "Off market",
  hidden_listing: "Hidden listing",
  quote_price: "Quote price",
  gst_status: "GST status",
  investment_flag: "Investment",
  tenanted: "Tenanted",
  lease_potential_weekly: "Lease potential",
  return_pct: "Return %",
  legal_description: "Legal description",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  notes: "Notes",
};

const TRACKED_CONTACT_FIELDS: Record<string, string> = {
  aml_id_verified: "AML ID verified",
  aml_pep_clear: "AML PEP cleared",
  aml_notes: "AML notes",
  name: "Name",
  email: "Email",
  phone: "Phone",
  mobile: "Mobile",
  pipeline_stage: "Pipeline stage",
  do_not_contact: "Do not contact",
  dnc_phone: "DNC phone",
  dnc_sms: "DNC SMS",
  dnc_email: "DNC email",
  dnc_mail: "DNC mail",
  buying_budget_min: "Budget min",
  buying_budget_max: "Budget max",
};

function formatAuditValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function logEntityFieldChanges(
  client: SupabaseClient,
  input: {
    userId: string;
    entityType: "contact" | "listing" | "property";
    entityId: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    fieldMap: Record<string, string>;
  },
): Promise<void> {
  const rows: {
    user_id: string;
    entity_type: string;
    entity_id: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    summary: string;
  }[] = [];

  for (const [key, label] of Object.entries(input.fieldMap)) {
    if (!(key in input.after)) continue;
    const oldV = formatAuditValue(input.before[key]);
    const newV = formatAuditValue(input.after[key]);
    if (oldV === newV) continue;
    rows.push({
      user_id: input.userId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      field_name: key,
      old_value: oldV,
      new_value: newV,
      summary: `${label}: ${oldV ?? "—"} → ${newV ?? "—"}`,
    });
  }

  if (!rows.length) return;

  const { error } = await client.from("entity_audit_log").insert(rows);
  if (error && error.code !== "42P01") {
    console.warn("entity_audit_log insert failed", error.message);
  }
}

export function listingAuditFieldMap(): Record<string, string> {
  return { ...TRACKED_LISTING_FIELDS };
}

export function contactAuditFieldMap(): Record<string, string> {
  return { ...TRACKED_CONTACT_FIELDS };
}
