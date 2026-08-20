import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import type { DesignRequest, DesignRequestKind } from "@/lib/marketingStudio";

// design_requests is newer than the generated Supabase types — cast the client.
// deno-lint-ignore no-explicit-any
const db = supabase as any;

const ACTIVE_STATUSES = ["pending", "generating", "candidates_ready", "selected"];

export function useDesignRequests(listingId: string | undefined) {
  return useQuery({
    queryKey: ["design_requests", listingId ?? ""],
    queryFn: async (): Promise<DesignRequest[]> => {
      if (!listingId) return [];
      const { data, error } = await db
        .from("design_requests")
        .select("*")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as DesignRequest[];
    },
    enabled: !!listingId,
    // Poll while anything is in flight so candidates/results appear without a refresh.
    refetchInterval: (query) => {
      const rows = (query.state.data ?? []) as DesignRequest[];
      return rows.some((r) => ACTIVE_STATUSES.includes(r.status)) ? 15000 : false;
    },
  });
}

export function useCreateDesignRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      kind: DesignRequestKind;
      brief: string;
    }): Promise<DesignRequest> => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await db
        .from("design_requests")
        .insert({ ...input, user_id: userId, status: "pending" })
        .select("*")
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as DesignRequest;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["design_requests", row.listing_id ?? ""] });
    },
  });
}

export function useSelectDesignCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listing_id: string | null; candidate_id: string }) => {
      const { error } = await db
        .from("design_requests")
        .update({
          selected_candidate_id: input.candidate_id,
          status: "selected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("status", "candidates_ready");
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: (_d, input) => {
      void qc.invalidateQueries({ queryKey: ["design_requests", input.listing_id ?? ""] });
    },
  });
}

export function useCancelDesignRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listing_id: string | null }) => {
      const { error } = await db
        .from("design_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .in("status", ["pending", "generating", "candidates_ready"]);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: (_d, input) => {
      void qc.invalidateQueries({ queryKey: ["design_requests", input.listing_id ?? ""] });
    },
  });
}
