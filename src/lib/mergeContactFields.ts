import type { Contact } from "@/hooks/useContacts";
import { getContactDisplayName } from "@/hooks/useContacts";

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function firstNonEmpty(...vals: unknown[]): string | null {
  for (const v of vals) {
    const s = trimStr(v);
    if (s) return s;
  }
  return null;
}

function distinctNonEmptyStrings(...vals: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of vals) {
    const s = trimStr(v);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out;
}

function mergeNotes(primary: Contact, others: Contact[]): string | null {
  const parts: string[] = [];
  const p = trimStr(primary.notes);
  if (p) parts.push(p);
  for (const o of others) {
    const n = trimStr(o.notes);
    if (n) parts.push(n);
  }
  if (parts.length === 0) return null;
  return parts.join("\n\n— — —\n\n");
}

/** Latest ISO timestamp among values (for last touch / activity). */
function maxIsoDate(...vals: (string | null | undefined)[]): string | null {
  let best: number | null = null;
  let bestStr: string | null = null;
  for (const v of vals) {
    if (!v) continue;
    const t = new Date(v).getTime();
    if (Number.isNaN(t)) continue;
    if (best == null || t > best) {
      best = t;
      bestStr = v;
    }
  }
  return bestStr;
}

/** Earliest follow-up among non-null (soonest). */
function minIsoDate(...vals: (string | null | undefined)[]): string | null {
  let best: number | null = null;
  let bestStr: string | null = null;
  for (const v of vals) {
    if (!v) continue;
    const t = new Date(v).getTime();
    if (Number.isNaN(t)) continue;
    if (best == null || t < best) {
      best = t;
      bestStr = v;
    }
  }
  return bestStr;
}

function mergeStringArrayField(
  primary: Contact,
  others: Contact[],
  key: keyof Contact
): string[] | null {
  const acc = new Set<string>();
  const collect = (row: Contact) => {
    const v = row[key];
    if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "string" && x.trim()) acc.add(x.trim());
      }
    }
  };
  collect(primary);
  for (const o of others) collect(o);
  if (acc.size === 0) return null;
  return [...acc];
}

/**
 * Build contacts row update for `primary` after absorbing `others`.
 * Keeps primary display name; merges phones, emails, notes, addresses, tags array, dates, etc.
 */
export function buildMergedContactUpdate(primary: Contact, others: Contact[]): Record<string, unknown> {
  const all = [primary, ...others];
  const displayName = getContactDisplayName(primary);

  const emails = distinctNonEmptyStrings(...all.map((c) => c.email));
  const email = emails[0] ?? null;
  const emailExtras = emails.slice(1);

  const phones = distinctNonEmptyStrings(...all.map((c) => c.phone), ...all.map((c) => c.mobile));
  const phone = phones[0] ?? null;
  const mobile = phones[1] ?? null;
  const phoneExtras = phones.slice(2);

  const notesBase = mergeNotes(primary, others);
  const extraLines: string[] = [];
  if (emailExtras.length) extraLines.push(`Other emails: ${emailExtras.join(", ")}`);
  if (phoneExtras.length) extraLines.push(`Other numbers: ${phoneExtras.join(", ")}`);
  const notes =
    extraLines.length > 0
      ? [notesBase, ...extraLines].filter(Boolean).join("\n\n")
      : notesBase;

  const out: Record<string, unknown> = {
    name: displayName || primary.name,
    first_name: primary.first_name ?? firstNonEmpty(...others.map((o) => o.first_name)),
    last_name: primary.last_name ?? firstNonEmpty(...others.map((o) => o.last_name)),
    contact_category: primary.contact_category,
    lead_temperature: primary.lead_temperature,
    timeframe_category: primary.timeframe_category,
    role_category: primary.role_category ?? firstNonEmpty(...others.map((o) => o.role_category)),
    relationship_category: primary.relationship_category ?? firstNonEmpty(...others.map((o) => o.relationship_category)),
    journey_stage: primary.journey_stage ?? firstNonEmpty(...others.map((o) => o.journey_stage)),
    rating: primary.rating ?? firstNonEmpty(...others.map((o) => o.rating)),
    classification_meta: primary.classification_meta ?? others.find((o) => o.classification_meta)?.classification_meta,
    email,
    phone,
    mobile,
    notes: notes ?? null,
    source: firstNonEmpty(primary.source, ...others.map((o) => o.source)),
    story: firstNonEmpty(primary.story, ...others.map((o) => o.story)),
    address: firstNonEmpty(primary.address, ...others.map((o) => o.address)),
    address_line1: firstNonEmpty(primary.address_line1, ...others.map((o) => o.address_line1)),
    address_line2: firstNonEmpty(primary.address_line2, ...others.map((o) => o.address_line2)),
    city: firstNonEmpty(primary.city, ...others.map((o) => o.city)),
    state: firstNonEmpty(primary.state, ...others.map((o) => o.state)),
    postcode: firstNonEmpty(primary.postcode, ...others.map((o) => o.postcode)),
    country: firstNonEmpty(primary.country, ...others.map((o) => o.country)),
    suburb: firstNonEmpty(primary.suburb, ...others.map((o) => o.suburb)),
    pipeline_stage: firstNonEmpty(primary.pipeline_stage, ...others.map((o) => o.pipeline_stage)),
    lead_status: firstNonEmpty(primary.lead_status, ...others.map((o) => o.lead_status)),
    lifecycle_stage: firstNonEmpty(primary.lifecycle_stage, ...others.map((o) => o.lifecycle_stage)),
    contact_type: firstNonEmpty(primary.contact_type, ...others.map((o) => o.contact_type)),
    preferred_contact_method: firstNonEmpty(
      primary.preferred_contact_method,
      ...others.map((o) => o.preferred_contact_method)
    ),
    pain_points: firstNonEmpty(primary.pain_points, ...others.map((o) => o.pain_points)),
    pleasure_points: firstNonEmpty(primary.pleasure_points, ...others.map((o) => o.pleasure_points)),
    current_situation_notes: firstNonEmpty(
      primary.current_situation_notes,
      ...others.map((o) => o.current_situation_notes)
    ),
    selling_intentions: firstNonEmpty(primary.selling_intentions, ...others.map((o) => o.selling_intentions)),
    coming_to_market: firstNonEmpty(primary.coming_to_market, ...others.map((o) => o.coming_to_market)),
    last_touch_date: maxIsoDate(
      primary.last_touch_date,
      ...others.map((o) => o.last_touch_date)
    ),
    last_activity_at: maxIsoDate(
      primary.last_activity_at,
      ...others.map((o) => o.last_activity_at)
    ),
    next_follow_up_at: minIsoDate(
      primary.next_follow_up_at,
      ...others.map((o) => o.next_follow_up_at)
    ),
    next_touch_date: minIsoDate(primary.next_touch_date, ...others.map((o) => o.next_touch_date)),
    do_not_contact: all.some((c) => c.do_not_contact === true) ? true : primary.do_not_contact,
    email_opt_out: all.some((c) => c.email_opt_out === true) ? true : primary.email_opt_out,
    sms_opt_out: all.some((c) => c.sms_opt_out === true) ? true : primary.sms_opt_out,
    updated_at: new Date().toISOString(),
  };

  const suburbs = mergeStringArrayField(primary, others, "preferred_suburbs" as keyof Contact);
  if (suburbs) out.preferred_suburbs = suburbs;

  const tagsCol = mergeStringArrayField(primary, others, "tags" as keyof Contact);
  if (tagsCol) out.tags = tagsCol;

  const budgetsMin = all.map((c) => c.buying_budget_min).filter((n): n is number => typeof n === "number");
  const budgetsMax = all.map((c) => c.buying_budget_max).filter((n): n is number => typeof n === "number");
  if (budgetsMin.length) out.buying_budget_min = Math.min(...budgetsMin);
  if (budgetsMax.length) out.buying_budget_max = Math.max(...budgetsMax);

  return out;
}

/** True if all contacts share the same normalised display name (allows merge without extra warning). */
export function contactsShareSameDisplayName(contacts: Contact[]): boolean {
  if (contacts.length < 2) return true;
  const keys = contacts.map((c) => getContactDisplayName(c).trim().toLowerCase().replace(/\s+/g, " "));
  const first = keys[0];
  return keys.every((k) => k === first);
}
