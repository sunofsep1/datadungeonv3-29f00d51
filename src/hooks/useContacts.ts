import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateContactScoreQueries } from "@/lib/contactScoreQuery";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  diffContactRows,
  formatAddressLines,
  logContactActivity,
  invalidateContactInteractions,
} from "@/lib/contactActivityLog";
import { applyClassificationDefaultsForNewContact } from "@/lib/leadCategoryService";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactChannel } from "./useContactChannels";

export type Contact = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;

/** Address fields: stored in contact_addresses or on contact (DataDungeon schema) */
export type ContactAddressFields = {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
};

const ADDRESS_KEYS = ["address_line1", "address_line2", "city", "state", "postcode", "country"] as const;

/** Build DataDungeon contact insert payload: name, status, address_line1, city, user_id */
function toContactInsertPayload(payload: Record<string, unknown>, userId: string): Record<string, unknown> {
  const { story, ...rest } = payload;
  const out = { ...rest, user_id: userId } as Record<string, unknown>;
  if (story != null && String(story).trim() && !out.notes) {
    out.notes = (out.notes ? String(out.notes) + "\n\n" : "") + String(story).trim();
  }
  return out;
}

/** Build DataDungeon contact update payload: pass through name, status, address_line1, city */
function toContactUpdatePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const { story, ...rest } = payload;
  const out = { ...rest } as Record<string, unknown>;
  if (story != null && String(story).trim() && !out.notes) {
    out.notes = (out.notes ? String(out.notes) + "\n\n" : "") + String(story).trim();
  }
  return out;
}

type PostgrestColumnError = { code?: string | null; message?: string | null };

function isMissingColumnError(error: PostgrestColumnError | null | undefined): boolean {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  if (error.code === "PGRST204" || error.code === "42703") return true;
  return message.includes("column") && (message.includes("could not find") || message.includes("does not exist"));
}

function getMissingColumnName(error: PostgrestColumnError | null | undefined): string | null {
  if (!error?.message) return null;
  const message = String(error.message);

  const pgrstMatch = message.match(/'([a-zA-Z0-9_]+)'\s+column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];

  const postgresMatch = message.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i);
  if (postgresMatch?.[1]) return postgresMatch[1];

  return null;
}

function omitMissingColumn(
  payload: Record<string, unknown>,
  error: PostgrestColumnError | null | undefined,
): Record<string, unknown> | null {
  const column = getMissingColumnName(error);
  if (!column || !(column in payload)) return null;
  const { [column]: _ignored, ...rest } = payload;
  return rest;
}

function keepExistingColumns(
  payload: Record<string, unknown>,
  existingRow: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!existingRow) return payload;
  const available = new Set(Object.keys(existingRow));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (available.has(key)) out[key] = value;
  }
  return out;
}

/** Split full name into first_name and last_name for HubSpot-style schema (no name column) */
function splitName(full: string): { first_name: string; last_name: string } {
  const s = String(full ?? "").trim();
  const i = s.indexOf(" ");
  if (i <= 0) return { first_name: s || "", last_name: "" };
  return { first_name: s.slice(0, i).trim(), last_name: s.slice(i + 1).trim() };
}

/** Minimal contact insert - only columns likely to exist in HubSpot contacts */
function pickHubSpotContactInsert(payload: Record<string, unknown>): Record<string, unknown> {
  const { name, user_id, ...rest } = payload;
  const out: Record<string, unknown> = {};
  if (name != null && String(name).trim()) {
    const { first_name, last_name } = splitName(String(name));
    out.first_name = first_name || "";
    out.last_name = last_name || "";
  }
  const ownerId = payload.owner_id ?? user_id;
  if (ownerId) out.owner_id = ownerId;
  const statusVal = rest.status ?? rest.lead_status;
  if (statusVal != null && String(statusVal).trim()) {
    const s = String(statusVal).toLowerCase();
    const m: Record<string, string> = {
      lead: "new",
      hot: "qualified",
      warm: "contacted",
      cold: "nurture",
      new: "new",
      contacted: "contacted",
      qualified: "qualified",
      nurture: "nurture",
      unqualified: "unqualified",
      customer: "customer",
    };
    out.lead_status = m[s] ?? "new";
  }
  if (rest.email != null && String(rest.email).trim()) out.email = String(rest.email).trim();
  if (rest.phone != null && String(rest.phone).trim()) out.phone = String(rest.phone).trim();
  if (rest.source != null && String(rest.source).trim()) out.source = String(rest.source).trim();
  if (rest.notes != null && String(rest.notes).trim()) out.notes = String(rest.notes).trim();
  return out;
}

function pickAddressFields(payload: Record<string, unknown>): Record<string, unknown> | null {
  const addr = {
    address_line1: payload.address_line1 ?? null,
    address_line2: payload.address_line2 ?? null,
    city: payload.city ?? null,
    state: payload.state ?? null,
    postal_code: payload.postcode ?? payload.postal_code ?? null,
    country: payload.country ?? "Australia",
  };
  const hasAny = ADDRESS_KEYS.some((k) => addr[k as keyof typeof addr] != null && String(addr[k as keyof typeof addr]).trim() !== "");
  return hasAny ? addr : null;
}

export type ContactTagRow = { tag_id: string; tags: { name: string } | null };
export type ContactPropertyLinkRow = {
  id?: string;
  property_id: string;
  role?: string;
  notes?: string | null;
  properties: { address_line1: string | null; city: string | null; state: string | null; postcode: string | null } | null;
};
export type ContactAddressRow = {
  id: string;
  contact_id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  address_type: string | null;
  is_primary: boolean;
};

export type ContactWithMeta = Contact & ContactAddressFields & {
  contact_channels?: ContactChannel[];
  contact_tags?: ContactTagRow[];
  contact_property_links?: ContactPropertyLinkRow[];
  contact_addresses?: ContactAddressRow[];
};

/** Omit nested `properties(...)` — can cause PostgREST 400; list path above hydrates links + properties separately. */
const CONTACTS_SELECT =
  "*, contact_channels(*), contact_tags(tag_id, tags(name)), contact_property_links(id, property_id, role, notes), contact_addresses(*)";

const CONTACTS_QUERY_KEYS = [["contacts"]];

/** Map primary/first contact_address onto contact for display (address_line1, postcode, etc.) */
export function mapContactAddressToDisplay(
  c: ContactWithMeta & { contact_addresses?: ContactAddressRow[] }
): ContactWithMeta {
  const addrs = c.contact_addresses ?? [];
  const primary = addrs.find((a) => a.is_primary) ?? addrs[0];
  if (!primary) return c;
  return {
    ...c,
    address_line1: primary.address_line1 ?? c.address_line1,
    address_line2: primary.address_line2 ?? c.address_line2,
    city: primary.city ?? c.city,
    state: primary.state ?? c.state,
    postcode: primary.postal_code ?? c.postcode,
    country: primary.country ?? c.country,
  };
}

/** Full name for list/detail when `name` is empty (HubSpot-style first/last columns). */
export function getContactDisplayName(c: ContactWithMeta | Record<string, unknown>): string {
  const row = c as Record<string, unknown>;
  const n = typeof row.name === "string" ? row.name.trim() : "";
  if (n) return n;
  const fn = typeof row.first_name === "string" ? row.first_name.trim() : "";
  const ln = typeof row.last_name === "string" ? row.last_name.trim() : "";
  const combined = [fn, ln].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  return "—";
}

function normalizeContactRowAfterWrite(
  row: Record<string, unknown>,
  requestedFullName: string | undefined
): Record<string, unknown> {
  const out = { ...row };
  const hasName = typeof out.name === "string" && out.name.trim().length > 0;
  if (hasName) return out;
  const fn = String(out.first_name ?? "").trim();
  const ln = String(out.last_name ?? "").trim();
  const combined = [fn, ln].filter(Boolean).join(" ").trim();
  if (combined) out.name = combined;
  else if (requestedFullName?.trim()) out.name = requestedFullName.trim();
  return out;
}

async function fetchContactAddressesByContactIds(
  contactIds: string[]
): Promise<Map<string, ContactAddressRow[]>> {
  const map = new Map<string, ContactAddressRow[]>();
  if (contactIds.length === 0) return map;
  try {
    const { data, error } = await supabase.from("contact_addresses").select("*").in("contact_id", contactIds);
    if (error || !Array.isArray(data)) return map;
    for (const row of data as ContactAddressRow[]) {
      const list = map.get(row.contact_id) ?? [];
      list.push(row);
      map.set(row.contact_id, list);
    }
  } catch {
    /* table missing or RLS */
  }
  return map;
}

/**
 * Fetches all contacts for the current user. Uses full select with relations when available,
 * falls back to simple select if relation tables are missing (e.g. before migrations).
 */
export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    retry: 1,
    queryFn: async () => {
      // Try simple select first (works with HubSpot schema - no contact_channels, contact_tags, etc.)
      const { data: simple, error: simpleError } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (!simpleError && simple != null) {
        const contacts = (simple ?? []) as Contact[];
        const contactIds = contacts.map((c) => c.id);
        const addrByContact = await fetchContactAddressesByContactIds(contactIds);

        const asMetaNoLinks = (c: Contact): ContactWithMeta =>
          mapContactAddressToDisplay({
            ...c,
            contact_channels: [],
            contact_tags: [],
            contact_property_links: [],
            contact_addresses: addrByContact.get(c.id) ?? [],
          } as ContactWithMeta);

        if (contactIds.length === 0) {
          return [];
        }

        try {
          const { data: links, error: linksErr } = await (supabase as any)
            .from("contact_property_links")
            .select("id, contact_id, property_id, role, notes")
            .in("contact_id", contactIds);
          if (linksErr || !Array.isArray(links) || links.length === 0) {
            return contacts.map(asMetaNoLinks);
          }
          const propertyIds = [...new Set(links.map((l: { property_id: string }) => l.property_id))];
          const { data: propertyRows } = await (supabase as any)
            .from("properties")
            .select("id, address_line1, address_line2, city, state, postcode, country, property_type")
            .in("id", propertyIds);
          const propertyMap = new Map(
            (propertyRows ?? []).map((p: { id: string }) => [p.id, p])
          );
          const linksByContactId = new Map<string, typeof links>();
          for (const l of links) {
            const list = linksByContactId.get(l.contact_id) ?? [];
            list.push(l);
            linksByContactId.set(l.contact_id, list);
          }
          return contacts.map((c) => {
            const contactLinks = linksByContactId.get(c.id) ?? [];
            const mergedLinks: ContactPropertyLinkRow[] = contactLinks.map(
              (l: { id: string; contact_id: string; property_id: string; role: string; notes: string | null }) => {
                const prop = propertyMap.get(l.property_id);
                return {
                  id: l.id,
                  property_id: l.property_id,
                  role: l.role ?? undefined,
                  notes: l.notes ?? null,
                  properties: prop
                    ? {
                        address_line1: prop.address_line1 ?? null,
                        city: prop.city ?? null,
                        state: prop.state ?? null,
                        postcode: prop.postcode ?? null,
                      }
                    : null,
                } as ContactPropertyLinkRow;
              }
            );
            return mapContactAddressToDisplay({
              ...c,
              contact_channels: [],
              contact_tags: [],
              contact_property_links: mergedLinks,
              contact_addresses: addrByContact.get(c.id) ?? [],
            } as ContactWithMeta);
          }) as ContactWithMeta[];
        } catch {
          return contacts.map(asMetaNoLinks);
        }
      }
      // Fallback: try full select with relations (DataDungeon schema)
      const { data, error } = await supabase
        .from("contacts")
        .select(CONTACTS_SELECT)
        .order("created_at", { ascending: false });
      if (!error) {
        const list = (data as unknown as (ContactWithMeta & { contact_addresses?: ContactAddressRow[] })[]) ?? [];
        return list.map((c) => {
          if (c.contact_channels) {
            c.contact_channels = (c.contact_channels as any[]).map((ch: any) => ({
              ...ch,
              value: ch.value ?? ch.channel_value,
            }));
          }
          return mapContactAddressToDisplay(c);
        }) as ContactWithMeta[];
      }
      throw simpleError ?? error;
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      contact: Omit<ContactInsert, "user_id"> & ContactAddressFields & { skipActivityLog?: boolean },
    ) => {
      const { skipActivityLog, ...contactData } = contact;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tryInsert = (payload: Record<string, unknown>) =>
        (supabase as any).from("contacts").insert(payload).select().single();

      // Prefer DataDungeon schema (user_id + name). Fall back to HubSpot schema (owner_id + first/last).
      let payload: Record<string, unknown> = toContactInsertPayload({ ...contactData }, user.id);
      let { data, error } = await tryInsert(payload);

      // Retry same schema after removing optional missing columns.
      const maxPayloadRetries = Math.max(1, Object.keys(payload).length + 2);
      for (let attempt = 0; error && isMissingColumnError(error) && attempt < maxPayloadRetries; attempt += 1) {
        const reducedPayload = omitMissingColumn(payload, error);
        if (!reducedPayload) break;
        payload = reducedPayload;
        const retry = await tryInsert(payload);
        data = retry.data;
        error = retry.error;
      }

      // If insert still fails with schema mismatch, try HubSpot-style fallback payload.
      if (error && isMissingColumnError(error)) {
        payload = pickHubSpotContactInsert({ ...contactData, owner_id: user.id });
        const firstFallback = await tryInsert(payload);
        data = firstFallback.data;
        error = firstFallback.error;
        const maxFallbackRetries = Math.max(1, Object.keys(payload).length + 2);
        for (let attempt = 0; error && isMissingColumnError(error) && attempt < maxFallbackRetries; attempt += 1) {
          const reducedPayload = omitMissingColumn(payload, error);
          if (!reducedPayload) break;
          payload = reducedPayload;
          const retry = await tryInsert(payload);
          data = retry.data;
          error = retry.error;
        }
      }
      if (error) throw error;
      if (!data) throw new Error("Contact insert returned no row");

      const normalized = normalizeContactRowAfterWrite(
        data as Record<string, unknown>,
        typeof contactData.name === "string" ? contactData.name : undefined
      ) as Contact & ContactAddressFields;

      if (normalized?.id) {
        try {
          await applyClassificationDefaultsForNewContact(supabase as SupabaseClient<Database>, normalized.id);
        } catch {
          /* DB without classification columns or RLS */
        }
      }

      const addressFields = pickAddressFields(contactData as Record<string, unknown>);
      if (addressFields && normalized?.id) {
        try {
          await (supabase as any)
            .from("contact_addresses")
            .insert({ contact_id: normalized.id, ...addressFields, address_type: "home", is_primary: true });
        } catch {
          // RLS or missing table; skip
        }
      }

      if (!skipActivityLog && normalized?.id) {
        const nm =
          (normalized as { name?: string | null }).name ?? (contactData as { name?: string }).name;
        await logContactActivity({
          contactId: normalized.id,
          subject: "Contact created",
          body: nm ? `Added: ${nm}` : "New contact added",
        });
      }

      return normalized;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact_addresses"] });
      queryClient.invalidateQueries({ queryKey: ["nurture_sequence_enrollments"] });
      if (data && (data as { id?: string }).id && !variables.skipActivityLog) {
        invalidateContactInteractions(queryClient, (data as { id: string }).id);
      }
      invalidateContactScoreQueries(queryClient);
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      skipActivityLog,
      ...updates
    }: ContactUpdate & ContactAddressFields & { id: string; skipActivityLog?: boolean }) => {
      const { data: beforeRow } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();

      const { data: current } = await supabase
        .from("contacts")
        .select("status")
        .eq("id", id)
        .single();

      const contactPayload = toContactUpdatePayload(updates as Record<string, unknown>) as Record<string, unknown>;
      let persistedPayload = keepExistingColumns(
        { ...contactPayload },
        (beforeRow as Record<string, unknown> | null | undefined) ?? null,
      );
      if (Object.keys(persistedPayload).length === 0) {
        throw new Error("No editable fields are available for this contact in the current database schema.");
      }
      let { data, error } = await supabase
        .from("contacts")
        .update(persistedPayload)
        .eq("id", id)
        .select()
        .single();
      // Gracefully retry when optional columns are missing in schema cache.
      const maxUpdateRetries = Math.max(1, Object.keys(persistedPayload).length + 2);
      for (let attempt = 0; error && isMissingColumnError(error) && attempt < maxUpdateRetries; attempt += 1) {
        const reducedPayload = omitMissingColumn(persistedPayload, error);
        if (!reducedPayload) break;
        persistedPayload = reducedPayload;
        if (Object.keys(persistedPayload).length === 0) {
          throw new Error("No updatable fields are available in this database schema. Run pending migrations and try again.");
        }
        const retry = await supabase
          .from("contacts")
          .update(persistedPayload)
          .eq("id", id)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;

      const addressFields = pickAddressFields(updates as Record<string, unknown>);
      if (addressFields) {
        try {
          const { data: existing } = await (supabase as any)
            .from("contact_addresses")
            .select("id")
            .eq("contact_id", id)
            .order("is_primary", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (existing?.id) {
            await (supabase as any)
              .from("contact_addresses")
              .update(addressFields)
              .eq("id", existing.id);
          } else {
            await (supabase as any)
              .from("contact_addresses")
              .insert({ contact_id: id, ...addressFields, address_type: "home", is_primary: true });
          }
        } catch {
          // contact_addresses may not exist in HubSpot-style schema
        }
      }

      if (!skipActivityLog) {
        const bodyParts: string[] = [];
        const keys = Object.keys(persistedPayload).filter((k) => persistedPayload[k] !== undefined);
        if (keys.length && beforeRow) {
          const lines = diffContactRows(
            beforeRow as Record<string, unknown>,
            data as Record<string, unknown>,
            keys,
          );
          bodyParts.push(...lines);
        }
        if (addressFields && Object.keys(addressFields).length) {
          bodyParts.push(`Address: ${formatAddressLines(addressFields)}`);
        }
        if (bodyParts.length) {
          await logContactActivity({
            contactId: id,
            subject: "Contact updated",
            body: bodyParts.join("\n"),
          });
        }
      }

      return { ...(data as Contact & ContactAddressFields), _oldStatus: current?.status };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["contact_addresses", variables.id] });
      if (!variables.skipActivityLog) {
        invalidateContactInteractions(queryClient, variables.id);
      }
      invalidateContactScoreQueries(queryClient);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      invalidateContactScoreQueries(queryClient);
    },
  });
}

/** Primary email from contact_channels or legacy contacts.email */
export function getPrimaryEmail(c: ContactWithMeta): string | null {
  const ch = (c.contact_channels ?? []).find(
    (x) => x.channel_type === "email" && x.is_primary
  );
  if (ch) return ch.value;
  return c.email ?? null;
}

/** Primary phone from contact_channels or legacy contacts.phone */
export function getPrimaryPhone(c: ContactWithMeta): string | null {
  const ch = (c.contact_channels ?? []).find(
    (x) =>
      (x.channel_type === "phone" || x.channel_type === "mobile") && x.is_primary
  );
  if (ch) return ch.value;
  return c.phone ?? null;
}

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  mobile: "Mobile",
  other: "Other",
};

/** All emails from contact_channels plus legacy contact.email if no channels */
export function getAllEmails(c: ContactWithMeta): { value: string; label: string; isPrimary: boolean }[] {
  const channels = (c.contact_channels ?? []).filter((x) => x.channel_type === "email");
  if (channels.length) {
    return channels.map((ch) => ({
      value: ch.value,
      label: (ch as { label?: string | null }).label ?? CHANNEL_LABELS.email,
      isPrimary: !!ch.is_primary,
    }));
  }
  const legacy = c.email;
  if (legacy) return [{ value: legacy, label: "Email", isPrimary: true }];
  return [];
}

/** All phone numbers from contact_channels (phone, mobile, other) plus legacy contact.phone if no channels */
export function getAllPhones(c: ContactWithMeta): { value: string; label: string; isPrimary: boolean }[] {
  const channels = (c.contact_channels ?? []).filter(
    (x) => x.channel_type === "phone" || x.channel_type === "mobile" || x.channel_type === "other"
  );
  if (channels.length) {
    return channels.map((ch) => ({
      value: ch.value,
      label: (ch as { label?: string | null }).label ?? CHANNEL_LABELS[ch.channel_type] ?? ch.channel_type,
      isPrimary: !!ch.is_primary,
    }));
  }
  const legacy = c.phone;
  if (legacy) return [{ value: legacy, label: "Phone", isPrimary: true }];
  return [];
}

/** Tag names for a contact */
export function getTagNames(c: ContactWithMeta): string[] {
  return (c.contact_tags ?? [])
    .map((ct) => ct.tags?.name)
    .filter((n): n is string => !!n);
}

/** First linked property address for export */
export function getLinkedPropertyAddress(c: ContactWithMeta): string {
  const links = c.contact_property_links ?? [];
  const first = links[0]?.properties;
  if (!first) return "";
  const parts = [first.address_line1, first.city, first.state, first.postcode].filter(Boolean);
  return parts.join(", ");
}

/** Format contact address as single line (e.g. "12 Smith St, Cleveland QLD 4163, Australia") */
export function formatContactAddress(c: ContactAddressFields | ContactWithMeta): string {
  const parts = [
    c.address_line1,
    c.address_line2,
    [c.city, c.state].filter(Boolean).join(" "),
    c.postcode,
    c.country,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}
