import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Manual types for tags (not in auto-generated types)
export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  user_id?: string;
  created_at?: string;
}

export interface TagInsert {
  name: string;
  color?: string | null;
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tags")
        .select("*")
        .order("name");
      if (error) {
        // Table might not exist
        if (error.message?.includes("does not exist")) return [];
        throw error;
      }
      return (data ?? []) as Tag[];
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tag: TagInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("tags")
        .insert({ ...tag, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("tags")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
