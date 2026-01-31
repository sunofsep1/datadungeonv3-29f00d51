import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

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
      const { data, error } = await supabase
        .from("listings")
        .select("*, contacts(id, name)")
        .order("created_at", { ascending: false });
      
      if (error) {
        // Fallback to simple select if relations don't exist
        const { data: simple, error: simpleError } = await supabase
          .from("listings")
          .select("*")
          .order("created_at", { ascending: false });
        if (simpleError) throw simpleError;
        return (simple ?? []) as Listing[];
      }
      return (data ?? []) as ListingWithContact[];
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
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
