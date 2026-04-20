import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type SavedViewObjectType = "contacts" | "tasks";

export type SavedViewRow = {
  id: string;
  name: string;
  object_type: string;
  filters: Json;
  sort_by: string | null;
  sort_direction: string | null;
  created_at: string | null;
  is_default: boolean | null;
};

export function useSavedViews(objectType: SavedViewObjectType) {
  return useQuery({
    queryKey: ["saved-views", objectType],
    queryFn: async (): Promise<SavedViewRow[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("saved_views")
        .select("id,name,object_type,filters,sort_by,sort_direction,created_at,is_default")
        .eq("owner_id", auth.user.id)
        .eq("object_type", objectType)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SavedViewRow[];
    },
    staleTime: 30_000,
  });
}

export function useCreateSavedView(objectType: SavedViewObjectType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: Json }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name is required");
      const { data, error } = await supabase
        .from("saved_views")
        .insert({
          owner_id: auth.user.id,
          name: trimmed,
          object_type: objectType,
          filters,
          visibility: "private",
          is_default: false,
        })
        .select("id,name,object_type,filters,sort_by,sort_direction,created_at,is_default")
        .single();
      if (error) throw error;
      return data as SavedViewRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", objectType] });
    },
  });
}

export function useDeleteSavedView(objectType: SavedViewObjectType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", objectType] });
    },
  });
}

export function useUpdateSavedViewName(objectType: SavedViewObjectType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name is required");
      const { error } = await supabase.from("saved_views").update({ name: trimmed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", objectType] });
    },
  });
}

/** Set the default saved view for this object type, or pass `null` to clear defaults. */
export function useSetDefaultSavedView(objectType: SavedViewObjectType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | null) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { error: clearErr } = await supabase
        .from("saved_views")
        .update({ is_default: false })
        .eq("owner_id", auth.user.id)
        .eq("object_type", objectType);
      if (clearErr) throw clearErr;
      if (id) {
        const { error } = await supabase
          .from("saved_views")
          .update({ is_default: true })
          .eq("id", id)
          .eq("owner_id", auth.user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", objectType] });
    },
  });
}
