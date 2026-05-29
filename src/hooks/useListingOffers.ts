import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import type { ListingOfferStatus } from "@/lib/listingOffers";
import {
  buildListingSyncPatchFromOffer,
  portalStatusFromOfferStatus,
} from "@/lib/listingOfferPipelineSync";

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
  expected_unconditional_date?: string | null;
  expected_settlement_date?: string | null;
  display_price?: string | null;
  portal_status?: string | null;
  vendor_solicitor_contact_id?: string | null;
  deposit_type?: string | null;
  deposit_amount?: number | null;
  commission_type?: string | null;
  gross_comm_incgst?: number | null;
  gross_comm_exgst?: number | null;
  balance_held_trust?: number | null;
  balance_held_ibd?: number | null;
  ibd_account_name?: string | null;
  ibd_account_number?: string | null;
  ibd_bsb?: string | null;
  ibd_bank?: string | null;
  ibd_branch?: string | null;
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

async function syncListingFromOfferRow(offer: ListingOffer, statusOverride?: string) {
  const status = statusOverride ?? offer.status;
  const listingPatch = buildListingSyncPatchFromOffer({
    status,
    exchange_date: offer.exchange_date,
    settlement_date: offer.settlement_date,
    expected_settlement_date: offer.expected_settlement_date,
  });
  if (Object.keys(listingPatch).length === 0) return;

  const { error } = await supabase.from("listings").update(listingPatch).eq("id", offer.listing_id);
  if (error) console.warn("syncListingFromOffer:", error.message);
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
      expected_unconditional_date?: string | null;
      expected_settlement_date?: string | null;
      offer_price?: number;
      notes?: string | null;
      display_price?: string | null;
      portal_status?: string | null;
      vendor_solicitor_contact_id?: string | null;
      deposit_type?: string | null;
      deposit_amount?: number | null;
      commission_type?: string | null;
      gross_comm_incgst?: number | null;
      gross_comm_exgst?: number | null;
      balance_held_trust?: number | null;
      balance_held_ibd?: number | null;
      ibd_account_name?: string | null;
      ibd_account_number?: string | null;
      ibd_bsb?: string | null;
      ibd_bank?: string | null;
      ibd_branch?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.status != null) {
        patch.status = input.status;
        const portal = portalStatusFromOfferStatus(input.status);
        if (portal) patch.portal_status = portal;
      }
      if (input.exchange_date !== undefined) patch.exchange_date = input.exchange_date;
      if (input.settlement_date !== undefined) patch.settlement_date = input.settlement_date;
      if (input.expected_unconditional_date !== undefined) {
        patch.expected_unconditional_date = input.expected_unconditional_date;
      }
      if (input.expected_settlement_date !== undefined) {
        patch.expected_settlement_date = input.expected_settlement_date;
      }
      if (input.offer_price != null) patch.offer_price = input.offer_price;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.display_price !== undefined) patch.display_price = input.display_price;
      if (input.portal_status != null) patch.portal_status = input.portal_status;
      if (input.vendor_solicitor_contact_id !== undefined) {
        patch.vendor_solicitor_contact_id = input.vendor_solicitor_contact_id;
      }
      if (input.deposit_type != null) patch.deposit_type = input.deposit_type;
      if (input.deposit_amount !== undefined) patch.deposit_amount = input.deposit_amount;
      if (input.commission_type != null) patch.commission_type = input.commission_type;
      if (input.gross_comm_incgst !== undefined) patch.gross_comm_incgst = input.gross_comm_incgst;
      if (input.gross_comm_exgst !== undefined) patch.gross_comm_exgst = input.gross_comm_exgst;
      if (input.balance_held_trust !== undefined) patch.balance_held_trust = input.balance_held_trust;
      if (input.balance_held_ibd !== undefined) patch.balance_held_ibd = input.balance_held_ibd;
      if (input.ibd_account_name !== undefined) patch.ibd_account_name = input.ibd_account_name;
      if (input.ibd_account_number !== undefined) patch.ibd_account_number = input.ibd_account_number;
      if (input.ibd_bsb !== undefined) patch.ibd_bsb = input.ibd_bsb;
      if (input.ibd_bank !== undefined) patch.ibd_bank = input.ibd_bank;
      if (input.ibd_branch !== undefined) patch.ibd_branch = input.ibd_branch;

      const { data, error } = await supabase
        .from("listing_offers")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      await syncOffersKpi(input.listing_id);
      const row = data as ListingOffer;
      if (input.status != null) {
        await syncListingFromOfferRow(row, input.status);
      }
      return row;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_offers", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listing", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["listing_contact_links", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
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
