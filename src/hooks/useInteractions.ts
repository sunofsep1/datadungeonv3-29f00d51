import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateContactScoreQueries } from "@/lib/contactScoreQuery";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface Interaction {
  id: string;
  contact_id: string;
  user_id: string;
  type: string;
  channel: string | null;
  subject: string | null;
  body: string | null;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface InteractionInsert {
  contact_id: string;
  type: string;
  channel?: string | null;
  subject?: string | null;
  body?: string | null;
  timestamp?: string;
}

export interface InteractionUpdate extends Partial<InteractionInsert> {
  id: string;
}

export function useInteractions(contactId?: string) {
  useRealtimeSubscription("interactions" as any, [["interactions", contactId]]);

  return useQuery({
    queryKey: ["interactions", contactId],
    queryFn: async () => {
      let query = (supabase.from("interactions" as any) as any)
        .select("*")
        .order("timestamp", { ascending: false });
      
      if (contactId) {
        query = query.eq("contact_id", contactId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Interaction[];
    },
    enabled: !!contactId,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interaction: InteractionInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      let userId = user?.id ?? null;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id ?? null;
      }
      if (!userId) throw new Error("Not authenticated");

      const now = new Date().toISOString();
      const payload = { ...interaction, user_id: userId, timestamp: interaction.timestamp ?? now };

      const { data, error } = await (supabase
        .from("interactions" as any) as any)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("contacts")
        .update({ last_activity_at: now, last_touch_date: now })
        .eq("id", interaction.contact_id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["interactions", variables.contact_id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", variables.contact_id] });
      invalidateContactScoreQueries(queryClient);
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await (supabase
        .from("interactions" as any) as any)
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ["interactions", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      invalidateContactScoreQueries(queryClient);
    },
  });
}
