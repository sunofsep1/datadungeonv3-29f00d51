import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logContactActivity } from "@/lib/contactActivityLog";

/** Reapit-style duplicate contact detection (email / phone fingerprint). */

export type ContactDuplicateCandidate = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  matchReasons: string[];
};

export function normalizeContactEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e && e.includes("@") ? e : null;
}

/** Last 9 digits for AU mobile matching. */
export function normalizeContactPhoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.length >= 10 && digits.startsWith("61")) return digits.slice(-9);
  if (digits.length >= 10 && digits.startsWith("0")) return digits.slice(-9);
  return digits.slice(-9);
}

function phoneMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = normalizeContactPhoneKey(a);
  const kb = normalizeContactPhoneKey(b);
  return !!ka && !!kb && ka === kb;
}

function candidatePhoneValues(row: {
  phone?: string | null;
  mobile?: string | null;
  extraPhones?: string[];
}): string[] {
  return [row.phone, row.mobile, ...(row.extraPhones ?? [])].filter(Boolean) as string[];
}

export function findContactDuplicates(
  candidates: Array<{
    id: string;
    name: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    extraPhones?: string[];
  }>,
  input: {
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    excludeId?: string | null;
  },
): ContactDuplicateCandidate[] {
  const normEmail = normalizeContactEmail(input.email);
  const inputPhones = [input.phone, input.mobile].filter(Boolean) as string[];
  const out: ContactDuplicateCandidate[] = [];

  for (const row of candidates) {
    if (input.excludeId && row.id === input.excludeId) continue;
    const reasons: string[] = [];
    if (normEmail && normalizeContactEmail(row.email) === normEmail) {
      reasons.push("Same email");
    }
    const rowPhones = candidatePhoneValues(row);
    for (const p of inputPhones) {
      if (rowPhones.some((rp) => phoneMatches(p, rp))) {
        reasons.push("Same phone");
        break;
      }
    }
    if (reasons.length === 0) continue;
    out.push({
      id: row.id,
      name: row.name,
      email: row.email ?? null,
      phone: row.phone ?? null,
      mobile: row.mobile ?? null,
      matchReasons: reasons,
    });
  }

  return out;
}

type DuplicateFetchInput = {
  userId: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  excludeId?: string | null;
};

/** Load duplicate candidates for email/phone (contacts + contact_channels). */
export async function fetchContactDuplicates(
  client: SupabaseClient,
  input: DuplicateFetchInput,
): Promise<ContactDuplicateCandidate[]> {
  const email = normalizeContactEmail(input.email);
  const phoneKey = normalizeContactPhoneKey(input.phone ?? input.mobile);
  if (!email && !phoneKey) return [];

  const scope = `user_id.eq.${input.userId},owner_id.eq.${input.userId}`;
  const collected = new Map<string, ContactDuplicateCandidate & { extraPhones?: string[] }>();

  if (email) {
    const { data, error } = await client
      .from("contacts")
      .select("id, name, email, phone, mobile")
      .or(scope)
      .ilike("email", email)
      .limit(15);
    if (error) throw error;
    for (const row of data ?? []) collected.set(row.id, row as ContactDuplicateCandidate);
  }

  if (phoneKey) {
    const tail = phoneKey.slice(-8);
    const { data, error } = await client
      .from("contacts")
      .select("id, name, email, phone, mobile")
      .or(scope)
      .or(`phone.ilike.%${tail}%,mobile.ilike.%${tail}%`)
      .limit(15);
    if (error) throw error;
    for (const row of data ?? []) collected.set(row.id, row as ContactDuplicateCandidate);

    const { data: channels, error: chErr } = await client
      .from("contact_channels")
      .select("contact_id, value, channel_type")
      .in("channel_type", ["phone", "mobile"])
      .ilike("value", `%${tail}%`)
      .limit(30);
    if (chErr && chErr.code !== "42P01") throw chErr;

    const channelContactIds = [...new Set((channels ?? []).map((c) => c.contact_id))];
    if (channelContactIds.length) {
      const { data: channelContacts, error: ccErr } = await client
        .from("contacts")
        .select("id, name, email, phone, mobile")
        .or(scope)
        .in("id", channelContactIds)
        .limit(15);
      if (ccErr) throw ccErr;

      const channelsByContact = new Map<string, string[]>();
      for (const ch of channels ?? []) {
        const list = channelsByContact.get(ch.contact_id) ?? [];
        list.push(ch.value);
        channelsByContact.set(ch.contact_id, list);
      }

      for (const row of channelContacts ?? []) {
        const prev = collected.get(row.id);
        const extraPhones = channelsByContact.get(row.id) ?? [];
        collected.set(row.id, {
          ...(prev ?? (row as ContactDuplicateCandidate)),
          ...row,
          extraPhones: [...new Set([...(prev?.extraPhones ?? []), ...extraPhones])],
        });
      }
    }
  }

  const rows = [...collected.values()].map(({ matchReasons: _m, ...rest }) => rest);
  return findContactDuplicates(rows, {
    email: input.email,
    phone: input.phone,
    mobile: input.mobile,
    excludeId: input.excludeId,
  });
}

/** Reapit-style: write a history note when duplicate contact details are detected on save. */
export async function logContactDuplicateConflicts(
  contactId: string,
  duplicates: ContactDuplicateCandidate[],
): Promise<void> {
  if (!duplicates.length) return;
  const summary = duplicates
    .slice(0, 5)
    .map((d) => `${d.name?.trim() || "Unnamed"} (${d.matchReasons.join(", ")})`)
    .join("; ");
  await logContactActivity({
    contactId,
    subject: "Conflicting contact details detected",
    body: `Possible duplicate(s): ${summary}`,
  });
}

export async function detectAndLogContactDuplicates(input: {
  contactId: string;
  userId: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
}): Promise<ContactDuplicateCandidate[]> {
  const duplicates = await fetchContactDuplicates(supabase, {
    userId: input.userId,
    email: input.email,
    phone: input.phone,
    mobile: input.mobile,
    excludeId: input.contactId,
  });
  await logContactDuplicateConflicts(input.contactId, duplicates);
  return duplicates;
}
