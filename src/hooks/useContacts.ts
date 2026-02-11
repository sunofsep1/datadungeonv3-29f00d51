import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { ContactChannel } from "./useContactChannels";

export type Contact = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;

/** Address fields: stored in contact_addresses (or legacy on contact if migration added them) */
export type ContactAddressFields = {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

const ADDRESS_KEYS = ["address_line1", "address_line2", "city", "state", "postcode", "country"] as const;

function pickContactInsert(payload: Record<string, unknown>): Record<string, unknown> {
  const { address_line1, address_line2, city, state, postcode, country, ...rest } = payload;
  return rest;
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

const CONTACTS_SELECT =
  "*, contact_channels(*), contact_tags(tag_id, tags(name)), contact_property_links(id, property_id, role, notes, properties(address_line1, city, state, postcode)), contact_addresses(*)";

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

/**
 * Fetches all contacts for the current user. Uses full select with relations when available,
 * falls back to simple select if relation tables are missing (e.g. before migrations).
 */
export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    retry: 1,
    queryFn: async () => {
      // Try full select with relations (requires contact_channels, contact_tags, contact_property_links, contact_addresses)
      const { data, error } = await supabase
        .from("contacts")
        .select(CONTACTS_SELECT)
        .order("created_at", { ascending: false });
      if (!error) {
        const list = (data ?? []) as (ContactWithMeta & { contact_addresses?: ContactAddressRow[] })[];
        return list.map((c) => mapContactAddressToDisplay(c)) as ContactWithMeta[];
      }
      // Fallback: full select can 400 if relations/tables don't exist (e.g. different Supabase schema)
      const { data: simple, error: simpleError } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (simpleError) throw simpleError;
      return ((simple ?? []) as Contact[]).map((c) => ({
        ...c,
        contact_channels: [],
        contact_tags: [],
        contact_property_links: [],
        contact_addresses: [],
      })) as ContactWithMeta[];
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<ContactInsert, "user_id"> & ContactAddressFields) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const contactPayload = pickContactInsert({ ...contact, user_id: user.id });
      const { data, error } = await supabase
        .from("contacts")
        .insert(contactPayload)
        .select()
        .single();
      if (error) throw error;

      const addressFields = pickAddressFields(contact as Record<string, unknown>);
      if (addressFields && data?.id) {
        await supabase
          .from("contact_addresses")
          .insert({ contact_id: data.id, ...addressFields, address_type: "home", is_primary: true });
      }

      return data as Contact & ContactAddressFields;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact_addresses"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & ContactAddressFields & { id: string }) => {
      const { data: current } = await supabase
        .from("contacts")
        .select("status")
        .eq("id", id)
        .single();

      const contactPayload = pickContactInsert(updates as Record<string, unknown>);
      const { data, error } = await supabase
        .from("contacts")
        .update(contactPayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      const addressFields = pickAddressFields(updates as Record<string, unknown>);
      if (addressFields) {
        const { data: existing } = await supabase
          .from("contact_addresses")
          .select("id")
          .eq("contact_id", id)
          .order("is_primary", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing?.id) {
          await supabase
            .from("contact_addresses")
            .update(addressFields)
            .eq("id", existing.id);
        } else {
          await supabase
            .from("contact_addresses")
            .insert({ contact_id: id, ...addressFields, address_type: "home", is_primary: true });
        }
      }

      return { ...(data as Contact & ContactAddressFields), _oldStatus: current?.status };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["contact_addresses", variables.id] });
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
