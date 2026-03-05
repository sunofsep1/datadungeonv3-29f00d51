import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact, ContactWithMeta, ContactAddressRow } from "./useContacts";
import { mapContactAddressToDisplay } from "./useContacts";

const CONTACT_SELECT =
  "*, contact_channels(*), contact_tags(tag_id, tags(name)), contact_property_links(id, property_id, role, notes, properties(*)), contact_addresses(*)";

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
    retry: 1,
    queryFn: async () => {
      if (!id) throw new Error("No contact ID provided");
      let contact: ContactWithMeta & { contact_addresses?: ContactAddressRow[] };
      // Try simple select first (HubSpot schema)
      const { data: simpleData, error: simpleErr } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (simpleErr || !simpleData) {
        const { data, error } = await (supabase as any)
          .from("contacts")
          .select(CONTACT_SELECT)
          .eq("id", id)
          .maybeSingle();
        if (!error && data) {
          contact = data as ContactWithMeta & { contact_addresses?: ContactAddressRow[] };
        } else {
          if (simpleErr) throw simpleErr;
          throw new Error("Contact not found");
        }
      } else {
        contact = {
          ...(simpleData as Contact),
          contact_channels: [],
          contact_tags: [],
          contact_property_links: [],
          contact_addresses: [],
        } as ContactWithMeta & { contact_addresses?: ContactAddressRow[] };
      }
      try {
        // Try simple select first - nested properties() can fail with 400 if schema uses different column names (e.g. HubSpot: address/suburb)
        const { data: links, error: linksErr } = await (supabase as any)
          .from("contact_property_links")
          .select("id, contact_id, property_id, role, notes")
          .eq("contact_id", id);
        if (!linksErr && Array.isArray(links) && links.length > 0) {
          const propertyIds = [...new Set(links.map((l: { property_id: string }) => l.property_id))];
          const { data: props } = await (supabase as any)
            .from("properties")
            .select("id, address_line1, address_line2, city, state, postcode, country, property_type, address, suburb")
            .in("id", propertyIds);
          const propMap = new Map((props ?? []).map((p: { id: string }) => [p.id, p]));
          contact.contact_property_links = links.map((l: { id: string; property_id: string; role: string; notes: string | null }) => {
            const p = propMap.get(l.property_id);
            return {
              ...l,
              properties: p
                ? {
                    id: p.id,
                    address_line1: p.address_line1 ?? p.address ?? null,
                    address_line2: p.address_line2 ?? null,
                    city: p.city ?? p.suburb ?? null,
                    state: p.state ?? null,
                    postcode: p.postcode ?? null,
                    country: p.country ?? null,
                    property_type: p.property_type ?? null,
                  }
                : null,
            };
          });
        }
      } catch {
        contact.contact_property_links = [];
      }
      return mapContactAddressToDisplay(contact) as ContactWithMeta;
    },
    enabled: !!id,
  });
}
