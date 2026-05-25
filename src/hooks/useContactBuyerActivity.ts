import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

export type ContactBuyerActivityRow = {
  id: string;
  kind: "listing_link" | "offer" | "inspection";
  listingId: string;
  listingAddress: string;
  label: string;
  detail: string | null;
  occurredAt: string;
  role?: string | null;
};

export function useContactBuyerActivity(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact_buyer_activity", contactId ?? ""],
    queryFn: async (): Promise<ContactBuyerActivityRow[]> => {
      if (!contactId) return [];
      const rows: ContactBuyerActivityRow[] = [];

      const { data: links, error: linkErr } = await supabase
        .from("listing_contact_links")
        .select("id, role, created_at, listing_id, listings(id, address)")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (linkErr && linkErr.code !== "42P01") throw new Error(supabaseErrorMessage(linkErr));
      for (const l of links ?? []) {
        const listing = l.listings as { id: string; address: string | null } | null;
        rows.push({
          id: `link-${l.id}`,
          kind: "listing_link",
          listingId: l.listing_id,
          listingAddress: listing?.address ?? "Listing",
          label: listing?.address ?? "Listing",
          detail: l.role ? l.role.replace(/_/g, " ") : null,
          occurredAt: l.created_at ?? new Date().toISOString(),
          role: l.role,
        });
      }

      const { data: offers, error: offerErr } = await supabase
        .from("listing_offers")
        .select("id, ref_code, status, offer_price, offer_date, listing_id, listings(id, address)")
        .eq("buyer_contact_id", contactId)
        .order("offer_date", { ascending: false })
        .limit(20);
      if (offerErr && offerErr.code !== "42P01") throw new Error(supabaseErrorMessage(offerErr));
      for (const o of offers ?? []) {
        const listing = o.listings as { id: string; address: string | null } | null;
        rows.push({
          id: `offer-${o.id}`,
          kind: "offer",
          listingId: o.listing_id,
          listingAddress: listing?.address ?? "Listing",
          label: `${o.ref_code} · ${o.status.replace(/_/g, " ")}`,
          detail: listing?.address ?? null,
          occurredAt: o.offer_date,
        });
      }

      const { data: inspections, error: inspErr } = await supabase
        .from("listing_inspection_attendees")
        .select(
          "id, checked_in_at, interest_level, listing_open_inspections(listing_id, listings(id, address))",
        )
        .eq("contact_id", contactId)
        .order("checked_in_at", { ascending: false })
        .limit(20);
      if (inspErr && inspErr.code !== "42P01") throw new Error(supabaseErrorMessage(inspErr));
      for (const a of inspections ?? []) {
        const insp = a.listing_open_inspections as {
          listing_id: string;
          listings: { id: string; address: string | null } | null;
        } | null;
        const listing = insp?.listings;
        rows.push({
          id: `insp-${a.id}`,
          kind: "inspection",
          listingId: insp?.listing_id ?? "",
          listingAddress: listing?.address ?? "Open inspection",
          label: "Attended inspection",
          detail: a.interest_level ? `Interest: ${a.interest_level}` : null,
          occurredAt: a.checked_in_at,
        });
      }

      return rows
        .filter((r) => r.listingId)
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    },
    enabled: !!contactId,
  });
}
