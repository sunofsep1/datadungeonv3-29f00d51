import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export type ContactChannel = Tables<"contact_channels">;
export type ContactChannelInsert = TablesInsert<"contact_channels">;
export type ContactChannelUpdate = TablesUpdate<"contact_channels">;

export function useContactChannels(contactId: string | undefined) {
  useRealtimeSubscription("contact_channels", [["contact_channels", contactId ?? ""]]);
  return useQuery({
    queryKey: ["contact_channels", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("contact_channels")
        .select("*")
        .eq("contact_id", contactId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactChannel[];
    },
    enabled: !!contactId,
  });
}

export function useCreateContactChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ch: ContactChannelInsert) => {
      const { data, error } = await supabase
        .from("contact_channels")
        .insert(ch)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["contact_channels", d.contact_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", d.contact_id] });
    },
  });
}

export function useUpdateContactChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      contact_id,
      ...updates
    }: ContactChannelUpdate & { id: string; contact_id: string }) => {
      const { data, error } = await supabase
        .from("contact_channels")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["contact_channels", d.contact_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", d.contact_id] });
    },
  });
}

export function useDeleteContactChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      contact_id,
    }: {
      id: string;
      contact_id: string;
    }) => {
      const { error } = await supabase
        .from("contact_channels")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { id, contact_id };
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["contact_channels", v.contact_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", v.contact_id] });
    },
  });
}
