import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

export type ListingCommissionSplit = {
  id: string;
  listing_id: string;
  user_id: string;
  agent_name: string;
  split_pct: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function useListingCommissionSplits(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_commission_splits", listingId ?? ""],
    queryFn: async (): Promise<ListingCommissionSplit[]> => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("listing_commission_splits")
        .select("*")
        .eq("listing_id", listingId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingCommissionSplit[];
    },
    enabled: !!listingId,
  });
}

export function useCreateListingCommissionSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      agent_name: string;
      split_pct: number;
      sort_order?: number;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("listing_commission_splits")
        .insert({
          listing_id: input.listing_id,
          user_id: user.id,
          agent_name: input.agent_name.trim(),
          split_pct: input.split_pct,
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingCommissionSplit;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_commission_splits", row.listing_id] });
    },
  });
}

export function useUpdateListingCommissionSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      listing_id: string;
      agent_name?: string;
      split_pct?: number;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.agent_name != null) patch.agent_name = input.agent_name.trim();
      if (input.split_pct != null) patch.split_pct = input.split_pct;

      const { data, error } = await supabase
        .from("listing_commission_splits")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingCommissionSplit;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_commission_splits", row.listing_id] });
    },
  });
}

export function useDeleteListingCommissionSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listingId: string }) => {
      const { error } = await supabase.from("listing_commission_splits").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["listing_commission_splits", v.listingId] });
    },
  });
}
