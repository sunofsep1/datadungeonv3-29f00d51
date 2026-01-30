import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { ContactChannel } from "./useContactChannels";

export type Contact = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;

/** Address fields on contacts (DB has these via migration; extend until types regenerated) */
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

export type ContactTagRow = { tag_id: string; tags: { name: string } | null };
export type ContactPropertyLinkRow = {
  id?: string;
  property_id: string;
  role?: string;
  notes?: string | null;
  properties: { address_line1: string | null; city: string | null; state: string | null; postcode: string | null } | null;
};
export type ContactWithMeta = Contact & ContactAddressFields & {
  contact_channels?: ContactChannel[];
  contact_tags?: ContactTagRow[];
  contact_property_links?: ContactPropertyLinkRow[];
};

const CONTACTS_SELECT =
  "*, contact_channels(*), contact_tags(tag_id, tags(name)), contact_property_links(id, property_id, role, notes, properties(address_line1, city, state, postcode))";

const CONTACTS_QUERY_KEYS = [["contacts"]];

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      // Try full select with relations
      const { data, error } = await (supabase as any)
        .from("contacts")
        .select(CONTACTS_SELECT)
        .order("created_at", { ascending: false });
      if (!error) return (data ?? []) as unknown as ContactWithMeta[];
      const msg = (error?.message ?? "").toLowerCase();
      const missingRelation =
        (msg.includes("relation") && msg.includes("does not exist")) ||
        msg.includes("contact_channels") ||
        msg.includes("contact_tags") ||
        msg.includes("contact_property_links") ||
        msg.includes("properties");
      if (!missingRelation) throw error;
      // Fallback to simple select
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

      const { data, error } = await (supabase as any)
        .from("contacts")
        .insert({ ...contact, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Contact & ContactAddressFields;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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

      const { data, error } = await (supabase as any)
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      return { ...(data as Contact & ContactAddressFields), _oldStatus: current?.status };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", variables.id] });
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
