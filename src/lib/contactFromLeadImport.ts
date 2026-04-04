import type { LeadInsert } from "@/hooks/useLeads";

/** Same name split as `supabase/functions/inbound-lead/index.ts`. */
export function splitDisplayName(full: string): { first: string; last: string } {
  const t = full.trim();
  if (!t) return { first: "Lead", last: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

/**
 * Contact insert payload aligned with inbound-lead webhook (create_contact path).
 */
export function buildContactInsertFromLeadRow(row: LeadInsert, userId: string): Record<string, unknown> {
  const displayName = String(row.name ?? "").trim() || "Lead";
  const { first, last } = splitDisplayName(displayName);
  const source = row.source?.trim() || "csv_import";
  const email = row.email?.trim() || null;
  const phone = row.phone?.trim() || null;
  const notes = row.notes?.trim() || null;
  const propertyInterest = row.property_interest?.trim() || null;
  const budgetMin = row.budget_min != null && Number.isFinite(row.budget_min) ? row.budget_min : null;
  const budgetMax = row.budget_max != null && Number.isFinite(row.budget_max) ? row.budget_max : null;
  const status = row.status?.trim() || null;

  const payload: Record<string, unknown> = {
    user_id: userId,
    owner_id: userId,
    first_name: first,
    last_name: last || null,
    name: displayName,
    email,
    phone,
    source,
    notes,
    contact_category: "warm_lead",
    property_requirements: propertyInterest ? { summary: propertyInterest } : null,
    buying_budget_min: budgetMin,
    buying_budget_max: budgetMax,
  };
  if (status) payload.status = status;
  return payload;
}
