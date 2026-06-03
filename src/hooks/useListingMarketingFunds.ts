import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

export type ListingMarketingFund = {
  id: string;
  listing_id: string;
  user_id: string;
  fund_date: string;
  comments: string | null;
  approved_amount: number;
  received_amount: number;
  created_at: string;
  updated_at: string;
};

export type ListingCampaignExpense = {
  id: string;
  listing_id: string;
  user_id: string;
  expense_date: string;
  category: string;
  supplier: string | null;
  invoice_no: string | null;
  item_comment: string | null;
  supplier_status: string;
  cost: number;
  office_paid: number;
  agent_paid: number;
  vendor_paid: number;
  created_at: string;
  updated_at: string;
};

export function useListingMarketingFunds(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_marketing_funds", listingId ?? ""],
    queryFn: async (): Promise<ListingMarketingFund[]> => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("listing_marketing_funds")
        .select("*")
        .eq("listing_id", listingId)
        .order("fund_date", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingMarketingFund[];
    },
    enabled: !!listingId,
  });
}

export function useListingCampaignExpenses(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_campaign_expenses", listingId ?? ""],
    queryFn: async (): Promise<ListingCampaignExpense[]> => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("listing_campaign_expenses")
        .select("*")
        .eq("listing_id", listingId)
        .order("expense_date", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingCampaignExpense[];
    },
    enabled: !!listingId,
  });
}

export function useCreateListingMarketingFund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      fund_date: string;
      comments?: string | null;
      approved_amount?: number;
      received_amount?: number;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("listing_marketing_funds")
        .insert({
          listing_id: input.listing_id,
          user_id: user.id,
          fund_date: input.fund_date,
          comments: input.comments?.trim() || null,
          approved_amount: input.approved_amount ?? 0,
          received_amount: input.received_amount ?? 0,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingMarketingFund;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_marketing_funds", row.listing_id] });
    },
  });
}

export function useDeleteListingMarketingFund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listingId: string }) => {
      const { error } = await supabase.from("listing_marketing_funds").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["listing_marketing_funds", v.listingId] });
    },
  });
}

export function useCreateListingCampaignExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      expense_date: string;
      category: string;
      supplier?: string | null;
      invoice_no?: string | null;
      item_comment?: string | null;
      supplier_status?: string;
      cost: number;
      office_paid?: number;
      agent_paid?: number;
      vendor_paid?: number;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("listing_campaign_expenses")
        .insert({
          listing_id: input.listing_id,
          user_id: user.id,
          expense_date: input.expense_date,
          category: input.category,
          supplier: input.supplier?.trim() || null,
          invoice_no: input.invoice_no?.trim() || null,
          item_comment: input.item_comment?.trim() || null,
          supplier_status: input.supplier_status ?? "pending",
          cost: input.cost,
          office_paid: input.office_paid ?? 0,
          agent_paid: input.agent_paid ?? 0,
          vendor_paid: input.vendor_paid ?? 0,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingCampaignExpense;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_campaign_expenses", row.listing_id] });
    },
  });
}

export function useDeleteListingCampaignExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listingId: string }) => {
      const { error } = await supabase.from("listing_campaign_expenses").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["listing_campaign_expenses", v.listingId] });
    },
  });
}
