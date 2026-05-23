import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Human-readable labels for `contacts` columns (activity log). */
export const CONTACT_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  source: "Source",
  aml_id_verified: "ID verified (AML)",
  aml_pep_clear: "PEP cleared",
  aml_notes: "AML notes",
  notes: "Notes",
  story: "Story",
  pipeline_stage: "Pipeline stage",
  selling_intentions: "Selling intentions",
  current_situation_notes: "Current situation",
  pain_points: "Pain points",
  pleasure_points: "Pleasure points",
  address_line1: "Address line 1",
  address_line2: "Address line 2",
  city: "City",
  state: "State",
  postcode: "Postcode",
  country: "Country",
  status: "Status",
  category: "Category",
  contact_category: "Contact category",
  lead_status: "Lead status",
  coming_to_market: "Coming to market",
  hubspot_contact_id: "HubSpot ID",
  owner_id: "Owner",
  last_activity_at: "Last activity",
};

function norm(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function short(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/** Compare two contact rows for the given keys; returns human-readable lines. */
export function diffContactRows(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[],
): string[] {
  const lines: string[] = [];
  const skip = new Set(["id", "user_id", "created_at", "updated_at", "last_activity_at"]);
  for (const key of keys) {
    if (skip.has(key)) continue;
    const b = norm(before[key]);
    const a = norm(after[key]);
    if (b !== a) {
      const label = CONTACT_FIELD_LABELS[key] ?? key;
      if (b.length > 80 || a.length > 80) {
        lines.push(`${label} updated`);
      } else {
        lines.push(`${label}: "${short(b || "—", 200)}" → "${short(a || "—", 200)}"`);
      }
    }
  }
  return lines;
}

export function formatAddressLines(addr: Record<string, unknown>): string {
  const parts = [
    addr.address_line1,
    addr.address_line2,
    [addr.city, addr.state].filter(Boolean).join(" "),
    addr.postal_code ?? addr.postcode,
    addr.country,
  ]
    .filter((x) => x != null && String(x).trim() !== "")
    .map(String);
  return parts.join(", ") || "(address details)";
}

/** Inserts a `interactions` row (type note, channel system) and bumps touch/activity timestamps. */
export async function logContactActivity(params: {
  contactId: string;
  subject: string;
  body?: string | null;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await (supabase.from("interactions" as any) as any).insert({
      contact_id: params.contactId,
      user_id: user.id,
      type: "note",
      channel: "system",
      subject: params.subject.trim().slice(0, 500),
      body: params.body?.trim() ? params.body.trim().slice(0, 8000) : null,
      timestamp: now,
    });
    if (error) {
      console.warn("[contactActivityLog]", error);
      return;
    }
    await supabase
      .from("contacts")
      .update({ last_activity_at: now, last_touch_date: now })
      .eq("id", params.contactId);
  } catch (e) {
    console.warn("[contactActivityLog]", e);
  }
}

export function invalidateContactInteractions(qc: QueryClient, contactId: string) {
  qc.invalidateQueries({ queryKey: ["interactions", contactId] });
  qc.invalidateQueries({ queryKey: ["contacts"] });
  qc.invalidateQueries({ queryKey: ["contact", contactId] });
}
