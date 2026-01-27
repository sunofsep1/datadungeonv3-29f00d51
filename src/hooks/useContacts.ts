import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export type Contact = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;

export type ContactChannel = Tables<"contact_channels">;
export type ContactTagRow = { tag_id: string; tags: { name: string } | null };
export type ContactPropertyLinkRow = {
  property_id: string;
  properties: { address_line1: string | null; city: string | null; state: string | null; postcode: string | null } | null;
};
export type ContactWithMeta = Contact & {
  contact_channels?: ContactChannel[];
  contact_tags?: ContactTagRow[];
  contact_property_links?: ContactPropertyLinkRow[];
};

const CONTACTS_SELECT =
  "*, contact_channels(*), contact_tags(tag_id, tags(name)), contact_property_links(property_id, properties(address_line1, city, state, postcode))";

const CONTACTS_QUERY_KEYS = [["contacts"]];

export function useContacts() {
  useRealtimeSubscription("contacts", CONTACTS_QUERY_KEYS);
  useRealtimeSubscription("contact_channels", CONTACTS_QUERY_KEYS);
  useRealtimeSubscription("contact_tags", CONTACTS_QUERY_KEYS);
  useRealtimeSubscription("contact_property_links", CONTACTS_QUERY_KEYS);

  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select(CONTACTS_SELECT)
        .order("created_at", { ascending: false });
      if (!error) return (data ?? []) as ContactWithMeta[];
      const msg = (error?.message ?? "").toLowerCase();
      const missingRelation =
        (msg.includes("relation") && msg.includes("does not exist")) ||
        msg.includes("contact_channels") ||
        msg.includes("contact_tags") ||
        msg.includes("contact_property_links") ||
        msg.includes("properties");
      if (!missingRelation) throw error;
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
    mutationFn: async (contact: Omit<ContactInsert, "user_id">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...contact, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      // Event logging for contact creation (future automation hook)
      // Could emit: { type: "contact.created", entityId: data.id, ... }
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & { id: string }) => {
      // Fetch current contact to detect status changes
      const { data: current } = await supabase
        .from("contacts")
        .select("status")
        .eq("id", id)
        .single();
      
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      
      // Return data with old status for event logging
      return { ...data, _oldStatus: current?.status };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", variables.id] });
      
      // Event logging for status changes (future automation hook)
      if (variables.status && (data as any)._oldStatus !== variables.status) {
        // Could emit: { type: "contact.status_changed", entityId: variables.id, oldStatus: (data as any)._oldStatus, newStatus: variables.status }
      }
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
  const ch = c.contact_channels?.find(
    (x) => x.channel_type === "email" && x.is_primary
  );
  if (ch) return ch.value;
  return c.email ?? null;
}

/** Primary phone from contact_channels or legacy contacts.phone */
export function getPrimaryPhone(c: ContactWithMeta): string | null {
  const ch = c.contact_channels?.find(
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
