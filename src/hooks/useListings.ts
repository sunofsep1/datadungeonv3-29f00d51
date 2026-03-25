import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { updateLeadCategoriesFromDealChange } from "@/lib/leadCategoryService";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Listing = Tables<"listings">;
export type ListingInsert = TablesInsert<"listings">;
export type ListingUpdate = TablesUpdate<"listings">;

export type ListingWithContact = Listing & {
  contacts?: { id: string; name: string } | null;
};

export function useListing(id: string | undefined) {
  useRealtimeSubscription("listings", [["listings"], ["listing", id ?? ""]]);

  return useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Listing;
    },
    enabled: !!id,
  });
}

export function useListings() {
  // Subscribe to realtime changes
  useRealtimeSubscription("listings", [["listings"]]);

  return useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      // Try simple select first (HubSpot schema - listings table may not have contacts relation)
      const { data: simple, error: simpleError } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!simpleError && simple != null) {
        return ((simple ?? []) as Listing[]).map((l) => ({ ...l, contacts: null })) as ListingWithContact[];
      }
      const { data, error } = await supabase
        .from("listings")
        .select("*, contacts(id, name)")
        .order("created_at", { ascending: false });
      if (!error) return (data ?? []) as ListingWithContact[];
      throw simpleError ?? error;
    },
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (listing: Omit<ListingInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("listings")
        .insert({ ...listing, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      if (data?.id) {
        const stage = variables.pipeline_stage ?? data.pipeline_stage ?? null;
        try {
          await updateLeadCategoriesFromDealChange(supabase as SupabaseClient<Database>, data.id, stage, {
            primaryContactId: data.contact_id ?? null,
          });
        } catch {
          /* migration not applied or column missing */
        }
        queryClient.invalidateQueries({ queryKey: ["listing", data.id] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        queryClient.invalidateQueries({ queryKey: ["nurture_sequence_enrollments"] });
      }
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: ListingUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("listings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      if (
        data &&
        Object.prototype.hasOwnProperty.call(variables, "pipeline_stage") &&
        variables.pipeline_stage !== undefined
      ) {
        try {
          await updateLeadCategoriesFromDealChange(
            supabase as SupabaseClient<Database>,
            variables.id,
            variables.pipeline_stage,
            { primaryContactId: data.contact_id ?? null }
          );
        } catch {
          /* migration not applied */
        }
        queryClient.invalidateQueries({ queryKey: ["listing", variables.id] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        queryClient.invalidateQueries({ queryKey: ["nurture_sequence_enrollments"] });
      }
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}
