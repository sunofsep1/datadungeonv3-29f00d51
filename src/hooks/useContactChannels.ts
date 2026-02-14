import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Manual types for contact_channels (not in auto-generated types)
export interface ContactChannel {
  id: string;
  contact_id: string;
  channel_type: "email" | "phone" | "mobile" | "other";
  value: string;
  is_primary: boolean;
  label?: string | null;
  created_at: string;
}

export interface ContactChannelInsert {
  contact_id: string;
  channel_type: "email" | "phone" | "mobile" | "other";
  value: string;
  is_primary?: boolean;
  label?: string | null;
}

export interface ContactChannelUpdate {
  channel_type?: "email" | "phone" | "mobile" | "other";
  value?: string;
  is_primary?: boolean;
  label?: string | null;
}

export function useContactChannels(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact_channels", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await (supabase as any)
        .from("contact_channels")
        .select("*")
        .eq("contact_id", contactId)
        .order("is_primary", { ascending: false });
      if (error) {
        // Table might not exist
        if (error.message?.includes("does not exist")) return [];
        throw error;
      }
      return ((data ?? []) as any[]).map((row) => ({
        ...row,
        value: row.value ?? row.channel_value ?? "",
      })) as ContactChannel[];
    },
    enabled: !!contactId,
  });
}

export function useCreateContactChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ch: ContactChannelInsert) => {
      const row = {
        contact_id: ch.contact_id,
        channel_type: ch.channel_type,
        channel_value: ch.value,
        is_primary: ch.is_primary ?? false,
        ...(ch.label != null && { label: ch.label }),
      };
      const { data, error } = await (supabase as any)
        .from("contact_channels")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      const out = data as any;
      return { ...out, value: out?.value ?? out?.channel_value ?? ch.value } as ContactChannel;
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
      value,
      ...rest
    }: ContactChannelUpdate & { id: string; contact_id: string }) => {
      const payload = value !== undefined ? { ...rest, channel_value: value } : rest;
      const { data, error } = await (supabase as any)
        .from("contact_channels")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      const out = data as any;
      return { ...out, value: out?.value ?? out?.channel_value ?? "" } as ContactChannel;
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
      const { error } = await (supabase as any)
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
