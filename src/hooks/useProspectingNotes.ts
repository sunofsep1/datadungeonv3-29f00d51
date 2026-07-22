import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ProspectingNote = {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  tags: string[];
  source: string;
  created_at: string;
  updated_at: string;
};

// `prospecting_notes` is not in the generated Supabase types yet.
// Run `npm run supabase:gen-types` to add it, then this cast can be removed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const KEY = ["prospecting_notes"] as const;

export function useProspectingNotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<ProspectingNote[]> => {
      if (!user) return [];
      const { data, error } = await sb
        .from("prospecting_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProspectingNote[];
    },
  });
}

export function useCreateProspectingNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { title?: string | null; body: string; tags?: string[] }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await sb
        .from("prospecting_notes")
        .insert({
          user_id: user.id,
          title: input.title ?? null,
          body: input.body,
          tags: input.tags ?? [],
          source: "manual",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as ProspectingNote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProspectingNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("prospecting_notes").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
