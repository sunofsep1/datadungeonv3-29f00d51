import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import type { ListingOfferStatus } from "@/lib/listingOffers";

export type ListingOffer = {
  id: string;
  listing_id: string;
  user_id: string;
  ref_code: string;
  offer_date: string;
  offer_price: number;
  buyer_contact_id: string | null;
  buyer_solicitor_contact_id: string | null;
  investor: boolean;
  inclusions: string | null;
  special_conditions: string | null;
  notes: string | null;
  status: string;
  exchange_date: string | null;
  settlement_date: string | null;
  created_at: string;
  updated_at: string;
  buyer?: { id: string; name: string | null; first_name: string | null; last_name: string | null } | null;
  solicitor?: { id: string; name: string | null; first_name: string | null; last_name: string | null } | null;
};

async function syncOffersKpi(listingId: string) {
  const { error } = await supabase.rpc("sync_listing_offers_kpis", { p_listing_id: listingId });
  if (error && error.code !== "42883" && error.code !== "PGRST202") {
    console.warn("sync_listing_offers_kpis:", error.message);
  }
}

export function useAllListingOffers() {
  return useQuery({
    queryKey: ["listing_offers", "all"],
    queryFn: async (): Promise<ListingOffer[]> => {
      const { data, error } = await supabase
        .from("listing_offers")
        .select("*")
        .order("offer_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingOffer[];
    },
  });
}

export function useListingOffers(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_offers", listingId ?? ""],
    queryFn: async (): Promise<ListingOffer[]> => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("listing_offers")
        .select("*")
        .eq("listing_id", listingId)
        .order("offer_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingOffer[];
    },
    enabled: !!listingId,
  });
}

export function useCreateListingOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      offer_date: string;
      offer_price: number;
      buyer_contact_id?: string | null;
      buyer_solicitor_contact_id?: string | null;
      investor?: boolean;
      inclusions?: string | null;
      special_conditions?: string | null;
      notes?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("listing_offers")
        .insert({
          listing_id: input.listing_id,
          user_id: user.id,
          offer_date: input.offer_date,
          offer_price: input.offer_price,
          buyer_contact_id: input.buyer_contact_id ?? null,
          buyer_solicitor_contact_id: input.buyer_solicitor_contact_id ?? null,
          investor: input.investor ?? false,
          inclusions: input.inclusions?.trim() || null,
          special_conditions: input.special_conditions?.trim() || null,
          notes: input.notes?.trim() || null,
          ref_code: "",
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      await syncOffersKpi(input.listing_id);
      return data as ListingOffer;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_offers", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listing", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["listing_contact_links", row.listing_id] });
    },
  });
}

export function useUpdateListingOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      listing_id: string;
      status?: ListingOfferStatus;
      exchange_date?: string | null;
      settlement_date?: string | null;
      offer_price?: number;
      notes?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.status != null) patch.status = input.status;
      if (input.exchange_date !== undefined) patch.exchange_date = input.exchange_date;
      if (input.settlement_date !== undefined) patch.settlement_date = input.settlement_date;
      if (input.offer_price != null) patch.offer_price = input.offer_price;
      if (input.notes !== undefined) patch.notes = input.notes;

      const { data, error } = await supabase
        .from("listing_offers")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      await syncOffersKpi(input.listing_id);
      return data as ListingOffer;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_offers", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listing", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["listing_contact_links", row.listing_id] });
    },
  });
}

export function useDeleteListingOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listingId: string }) => {
      const { error } = await supabase.from("listing_offers").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
      await syncOffersKpi(input.listingId);
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["listing_offers", v.listingId] });
      void qc.invalidateQueries({ queryKey: ["listing", v.listingId] });
      void qc.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}
