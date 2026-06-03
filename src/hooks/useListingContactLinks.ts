import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

export const LISTING_CONTACT_ROLES = [
  { value: "vendor", label: "Vendor" },
  { value: "prospective_buyer", label: "Prospective buyer" },
  { value: "owner_occupier", label: "Owner occupier" },
  { value: "tenant", label: "Tenant" },
  { value: "solicitor", label: "Solicitor" },
  { value: "buyer_solicitor", label: "Buyer solicitor" },
  { value: "body_corp", label: "Body corporate" },
  { value: "agent", label: "Agent" },
  { value: "conjunctional_agent", label: "Conjunctional agent" },
  { value: "key_buyer", label: "Key buyer" },
  { value: "campaign_manager", label: "Campaign manager" },
] as const;

export type ListingContactLink = {
  id: string;
  listing_id: string;
  contact_id: string;
  role: string;
  offer_status: string | null;
  firm_name: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  contacts?: { id: string; name: string | null; first_name: string | null; last_name: string | null } | null;
};

export type ListingContactLinkWithListing = ListingContactLink & {
  listings?: {
    id: string;
    address: string | null;
    pipeline_stage: string | null;
  } | null;
};

/** All listing↔contact links for reports (appraisal/listing contacts). */
export function useAllListingContactLinks() {
  return useQuery({
    queryKey: ["listing_contact_links", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_contact_links")
        .select("*, contacts(id, name, first_name, last_name), listings(id, address, pipeline_stage)")
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [] as ListingContactLinkWithListing[];
        throw error;
      }
      return (data ?? []) as ListingContactLinkWithListing[];
    },
  });
}

export function useListingContactLinks(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_contact_links", listingId ?? ""],
    queryFn: async () => {
      if (!listingId) return [] as ListingContactLink[];
      const { data, error } = await supabase
        .from("listing_contact_links")
        .select("*, contacts(id, name, first_name, last_name)")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [] as ListingContactLink[];
        throw error;
      }
      return (data ?? []) as ListingContactLink[];
    },
    enabled: !!listingId,
  });
}

export function useAddListingContactLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      contact_id: string;
      role: string;
      firm_name?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("listing_contact_links")
        .insert({
          listing_id: input.listing_id,
          contact_id: input.contact_id,
          role: input.role,
          firm_name: input.firm_name ?? null,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingContactLink;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["listing_contact_links", v.listing_id] });
    },
  });
}

export function useDeleteListingContactLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listingId: string }) => {
      const { error } = await supabase.from("listing_contact_links").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["listing_contact_links", v.listingId] });
    },
  });
}
