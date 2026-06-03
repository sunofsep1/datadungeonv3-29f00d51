import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import type { ListingResourceKind } from "@/lib/listingFeatures";

export type ListingResource = {
  id: string;
  listing_id: string;
  user_id: string;
  kind: ListingResourceKind;
  title: string | null;
  url: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function useListingResources(listingId: string | undefined, kind?: ListingResourceKind) {
  return useQuery({
    queryKey: ["listing_resources", listingId ?? "", kind ?? "all"],
    queryFn: async (): Promise<ListingResource[]> => {
      if (!listingId) return [];
      let q = supabase
        .from("listing_resources")
        .select("*")
        .eq("listing_id", listingId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingResource[];
    },
    enabled: !!listingId,
  });
}

export function useCreateListingResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      kind: ListingResourceKind;
      title?: string | null;
      url: string;
      sort_order?: number;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("listing_resources")
        .insert({
          listing_id: input.listing_id,
          user_id: auth.user.id,
          kind: input.kind,
          title: input.title?.trim() || null,
          url: input.url.trim(),
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingResource;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["listing_resources", data.listing_id] });
    },
  });
}

export function useDeleteListingResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listing_id: string }) => {
      const { error } = await supabase.from("listing_resources").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["listing_resources", input.listing_id] });
    },
  });
}

export function useUpdateListingResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      listing_id: string;
      title?: string | null;
      url?: string;
      sort_order?: number;
    }) => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.title !== undefined) patch.title = input.title?.trim() || null;
      if (input.url !== undefined) patch.url = input.url.trim();
      if (input.sort_order !== undefined) patch.sort_order = input.sort_order;
      const { data, error } = await supabase
        .from("listing_resources")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingResource;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["listing_resources", data.listing_id] });
    },
  });
}
