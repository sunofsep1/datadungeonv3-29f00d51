import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ScriptRow = Database["public"]["Tables"]["scripts"]["Row"];
type ScriptInsert = Database["public"]["Tables"]["scripts"]["Insert"];
type ScriptUpdate = Database["public"]["Tables"]["scripts"]["Update"];

export type ScriptCategory =
  | "listing_presentation"
  | "objection_handling"
  | "follow_up"
  | "cold_call"
  | "price_reduction"
  | "commission_defence"
  | "appraisal_booking"
  | "annual_review"
  | "text_template"
  | "other";

export type ScriptRecord = ScriptRow;

export function useScriptSearch(searchText: string, enabled: boolean) {
  const q = searchText.trim();
  return useQuery({
    queryKey: ["scripts-search", q],
    enabled: enabled && q.length >= 2,
    queryFn: async (): Promise<ScriptRecord[]> => {
      const { data, error } = await (supabase as any).rpc("search_scripts", {
        p_query: q,
        p_limit: 30,
      });
      if (error) throw error;
      return (data ?? []) as ScriptRecord[];
    },
    staleTime: 30_000,
  });
}

export function useScripts() {
  return useQuery({
    queryKey: ["scripts"],
    queryFn: async (): Promise<ScriptRecord[]> => {
      const { data, error } = await supabase
        .from("scripts")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Omit<ScriptInsert, "user_id">) => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("scripts")
        .insert({
          ...payload,
          user_id: authData.user.id,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scripts"] });
      queryClient.invalidateQueries({ queryKey: ["scripts-search"] });
    },
  });
}

export function useUpdateScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ScriptUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("scripts")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scripts"] });
      queryClient.invalidateQueries({ queryKey: ["scripts-search"] });
    },
  });
}

export function useDeleteScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scripts"] });
      queryClient.invalidateQueries({ queryKey: ["scripts-search"] });
    },
  });
}
