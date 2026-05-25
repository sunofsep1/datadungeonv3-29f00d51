import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import type { OfferCondition, OfferConditionStatus, OfferConditionType } from "@/lib/offerConditions";

export function useOfferConditions(offerId: string | undefined) {
  return useQuery({
    queryKey: ["offer_conditions", offerId ?? ""],
    queryFn: async (): Promise<OfferCondition[]> => {
      if (!offerId) return [];
      const { data, error } = await supabase
        .from("offer_conditions")
        .select("*")
        .eq("offer_id", offerId)
        .order("sort_order", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as OfferCondition[];
    },
    enabled: !!offerId,
  });
}

export function useSeedOfferConditions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      offer_id: string;
      listing_id: string;
      rows: Array<{
        condition_type: OfferConditionType;
        label: string;
        due_date: string;
        sort_order: number;
      }>;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("offer_conditions")
        .select("id")
        .eq("offer_id", input.offer_id)
        .limit(1);
      if (existing?.length) return existing;

      const payload = input.rows.map((row) => ({
        ...row,
        offer_id: input.offer_id,
        listing_id: input.listing_id,
        user_id: user.id,
        status: "pending" as const,
      }));

      const { data, error } = await supabase.from("offer_conditions").insert(payload).select();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as OfferCondition[];
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["offer_conditions", v.offer_id] });
    },
  });
}

export function useUpdateOfferCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      offer_id: string;
      status?: OfferConditionStatus;
      due_date?: string;
      label?: string;
      notes?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.status != null) {
        patch.status = input.status;
        patch.completed_at = input.status === "complete" ? new Date().toISOString() : null;
      }
      if (input.due_date != null) patch.due_date = input.due_date;
      if (input.label != null) patch.label = input.label;
      if (input.notes !== undefined) patch.notes = input.notes;

      const { data, error } = await supabase
        .from("offer_conditions")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as OfferCondition;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["offer_conditions", row.offer_id] });
    },
  });
}

export function useCompleteAllOfferConditions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { offer_id: string }) => {
      const { error } = await supabase
        .from("offer_conditions")
        .update({ status: "complete", completed_at: new Date().toISOString() })
        .eq("offer_id", input.offer_id)
        .in("status", ["pending", "overdue"]);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["offer_conditions", v.offer_id] });
    },
  });
}
