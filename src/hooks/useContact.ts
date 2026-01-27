import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact, ContactWithMeta } from "./useContacts";

const CONTACT_SELECT =
  "*, contact_channels(*), contact_tags(tag_id, tags(name)), contact_property_links(property_id, properties(address_line1, city, state, postcode))";

function isRelationError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    (m.includes("relation") && m.includes("does not exist")) ||
    m.includes("contact_channels") ||
    m.includes("contact_tags") ||
    m.includes("contact_property_links") ||
    m.includes("properties")
  );
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      if (!id) throw new Error("No contact ID provided");
      const { data, error } = await supabase
        .from("contacts")
        .select(CONTACT_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (!error) {
        if (!data) throw new Error("Contact not found");
        return data as ContactWithMeta;
      }
      if (!isRelationError(error?.message ?? "")) throw error;
      const { data: simple, error: simpleError } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (simpleError) throw simpleError;
      if (!simple) throw new Error("Contact not found");
      return {
        ...(simple as Contact),
        contact_channels: [],
        contact_tags: [],
        contact_property_links: [],
      } as ContactWithMeta;
    },
    enabled: !!id,
  });
}
