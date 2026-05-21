import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import { normalizeHitMonth, type ListingPortalHitRow } from "@/lib/listingPortalHits";

export function useListingPortalHits(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_portal_hits", listingId ?? ""],
    queryFn: async (): Promise<ListingPortalHitRow[]> => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("listing_portal_hits")
        .select("id, listing_id, hit_month, portal_key, hit_count, source, notes")
        .eq("listing_id", listingId)
        .order("hit_month", { ascending: false })
        .limit(120);
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingPortalHitRow[];
    },
    enabled: !!listingId,
  });
}

export function useUpsertListingPortalHit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      hit_month: string;
      hit_count: number;
      portal_key?: string | null;
      notes?: string | null;
      source?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const hitMonth = normalizeHitMonth(input.hit_month);
      const portalKey = input.portal_key?.trim() || null;

      let existingQuery = supabase
        .from("listing_portal_hits")
        .select("id")
        .eq("listing_id", input.listing_id)
        .eq("hit_month", hitMonth);

      existingQuery = portalKey
        ? existingQuery.eq("portal_key", portalKey)
        : existingQuery.is("portal_key", null);

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing?.id) {
        const { data, error } = await supabase
          .from("listing_portal_hits")
          .update({
            hit_count: input.hit_count,
            notes: input.notes?.trim() || null,
            source: input.source ?? "manual",
          })
          .eq("id", existing.id)
          .select("id, listing_id, hit_month, portal_key, hit_count, source, notes")
          .single();
        if (error) throw new Error(supabaseErrorMessage(error));
        return data as ListingPortalHitRow;
      }

      const { data, error } = await supabase
        .from("listing_portal_hits")
        .insert({
          listing_id: input.listing_id,
          user_id: user.id,
          hit_month: hitMonth,
          portal_key: portalKey,
          hit_count: input.hit_count,
          notes: input.notes?.trim() || null,
          source: input.source ?? "manual",
        })
        .select("id, listing_id, hit_month, portal_key, hit_count, source, notes")
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingPortalHitRow;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_portal_hits", row.listing_id] });
    },
  });
}

export function useDeleteListingPortalHit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listing_id: string }) => {
      const { error } = await supabase.from("listing_portal_hits").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
      return input;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_portal_hits", row.listing_id] });
    },
  });
}
