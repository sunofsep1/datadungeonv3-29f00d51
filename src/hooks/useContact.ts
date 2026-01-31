import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact, ContactWithMeta, ContactAddressRow } from "./useContacts";
import { mapContactAddressToDisplay } from "./useContacts";

const CONTACT_SELECT =
  "*, contact_channels(*), contact_tags(tag_id, tags(name)), contact_property_links(id, property_id, role, notes, properties(*)), contact_addresses(*)";

const CONTACT_PROPERTY_LINKS_SELECT =
  "id, property_id, role, notes, properties(id, address_line1, address_line2, city, state, postcode, country, property_type)";

function isRelationError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    (m.includes("relation") && m.includes("does not exist")) ||
    m.includes("contact_channels") ||
    m.includes("contact_tags") ||
    m.includes("contact_property_links") ||
    m.includes("contact_addresses") ||
    m.includes("properties")
  );
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      if (!id) throw new Error("No contact ID provided");
      let contact: ContactWithMeta & { contact_addresses?: ContactAddressRow[] };
      const { data, error } = await (supabase as any)
        .from("contacts")
        .select(CONTACT_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (!error && data) {
        contact = data as ContactWithMeta & { contact_addresses?: ContactAddressRow[] };
      } else {
        if (error && !isRelationError(error?.message ?? "")) throw error;
        const { data: simple, error: simpleError } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (simpleError) throw simpleError;
        if (!simple) throw new Error("Contact not found");
        contact = {
          ...(simple as Contact),
          contact_channels: [],
          contact_tags: [],
          contact_property_links: [],
          contact_addresses: [],
        } as ContactWithMeta & { contact_addresses?: ContactAddressRow[] };
      }
      const { data: links, error: linksErr } = await (supabase as any)
        .from("contact_property_links")
        .select(CONTACT_PROPERTY_LINKS_SELECT)
        .eq("contact_id", id);
      if (!linksErr && Array.isArray(links)) {
        contact.contact_property_links = links;
      }
      return mapContactAddressToDisplay(contact) as ContactWithMeta;
    },
    enabled: !!id,
  });
}
