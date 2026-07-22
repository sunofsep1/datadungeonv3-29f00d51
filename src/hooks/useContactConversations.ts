import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ContactConversation = {
  id: string;
  user_id: string;
  contact_id: string;
  occurred_at: string;
  channel: string;
  summary: string | null;
  highlights: string[];
  next_steps: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

// `contact_conversations` is not in the generated Supabase types yet.
// Run `npm run supabase:gen-types` to add it, then this cast can be removed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const key = (contactId?: string | null) => ["contact_conversations", contactId ?? "none"] as const;

export function useContactConversations(contactId?: string | null) {
  return useQuery({
    queryKey: key(contactId),
    enabled: Boolean(contactId),
    queryFn: async (): Promise<ContactConversation[]> => {
      if (!contactId) return [];
      const { data, error } = await sb
        .from("contact_conversations")
        .select("*")
        .eq("contact_id", contactId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactConversation[];
    },
  });
}

export function useCreateContactConversation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      contact_id: string;
      summary: string;
      channel?: string;
      occurred_at?: string;
      highlights?: string[];
      next_steps?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await sb
        .from("contact_conversations")
        .insert({
          contact_id: input.contact_id,
          user_id: user.id,
          summary: input.summary,
          channel: input.channel ?? "call",
          occurred_at: input.occurred_at ?? new Date().toISOString(),
          highlights: input.highlights ?? [],
          next_steps: input.next_steps ?? null,
          source: "manual",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as ContactConversation;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: key(row.contact_id) });
    },
  });
}

export function useDeleteContactConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; contact_id: string }) => {
      const { error } = await sb.from("contact_conversations").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (v) => qc.invalidateQueries({ queryKey: key(v.contact_id) }),
  });
}
