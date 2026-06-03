import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type SmsList = Database["public"]["Tables"]["sms_contact_lists"]["Row"];
type SmsListMember = Database["public"]["Tables"]["sms_contact_list_members"]["Row"];
type SmsUserTemplate = Database["public"]["Tables"]["sms_user_templates"]["Row"];
type SmsScheduled = Database["public"]["Tables"]["sms_scheduled_broadcasts"]["Row"];

const qLists = ["sms_contact_lists"] as const;
const qMembers = ["sms_contact_list_members"] as const;
const qTemplates = ["sms_user_templates"] as const;
const qScheduled = ["sms_scheduled_broadcasts"] as const;
const qOutbound = ["sms_outbound_history"] as const;

export function useSmsContactLists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qLists, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sms_contact_lists")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SmsList[];
    },
    enabled: Boolean(user),
  });
}

export function useSmsListMemberCount(listId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qMembers, "count", listId],
    queryFn: async () => {
      if (!user || !listId) return 0;
      const { count, error } = await supabase
        .from("sms_contact_list_members")
        .select("contact_id", { count: "exact", head: true })
        .eq("list_id", listId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(user && listId),
  });
}

export function useSmsListMembers(listId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qMembers, listId],
    queryFn: async () => {
      if (!user || !listId) return [];
      const { data, error } = await supabase
        .from("sms_contact_list_members")
        .select("contact_id")
        .eq("list_id", listId);
      if (error) throw error;
      return (data ?? []).map((r) => r.contact_id);
    },
    enabled: Boolean(user && listId),
  });
}

export function useSmsUserTemplates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qTemplates, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sms_user_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SmsUserTemplate[];
    },
    enabled: Boolean(user),
  });
}

export function useSmsScheduledBroadcasts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qScheduled, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sms_scheduled_broadcasts")
        .select("*")
        .eq("user_id", user.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SmsScheduled[];
    },
    enabled: Boolean(user),
  });
}

export function useSmsOutboundHistory(limit = 200) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qOutbound, user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sms_outbound")
        .select("id, contact_id, to_phone, body_preview, status, created_at, error")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user),
  });
}

export function useSmsSuiteMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: [...qLists] });
    qc.invalidateQueries({ queryKey: [...qMembers] });
    qc.invalidateQueries({ queryKey: [...qTemplates] });
    qc.invalidateQueries({ queryKey: [...qScheduled] });
    qc.invalidateQueries({ queryKey: [...qOutbound] });
  };

  const createList = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await supabase
        .from("sms_contact_lists")
        .insert({ user_id: user.id, name: input.name.trim(), description: input.description?.trim() || null })
        .select("id")
        .single();
      if (error) throw error;
      return data!.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...qLists] }),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_contact_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...qLists] });
      qc.invalidateQueries({ queryKey: [...qMembers] });
    },
  });

  const setListMembers = useMutation({
    mutationFn: async (input: { listId: string; contactIds: string[] }) => {
      const { error: delErr } = await supabase.from("sms_contact_list_members").delete().eq("list_id", input.listId);
      if (delErr) throw delErr;
      const rows = [...new Set(input.contactIds)].map((contact_id) => ({
        list_id: input.listId,
        contact_id,
      }));
      if (rows.length === 0) return;
      const { error } = await supabase.from("sms_contact_list_members").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: [...qMembers, v.listId] });
      qc.invalidateQueries({ queryKey: [...qMembers, "count", v.listId] });
    },
  });

  const addListMembers = useMutation({
    mutationFn: async (input: { listId: string; contactIds: string[] }) => {
      const rows = [...new Set(input.contactIds)].map((contact_id) => ({
        list_id: input.listId,
        contact_id,
      }));
      if (rows.length === 0) return;
      const { error } = await supabase.from("sms_contact_list_members").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: [...qMembers, v.listId] });
      qc.invalidateQueries({ queryKey: [...qMembers, "count", v.listId] });
    },
  });

  const removeListMember = useMutation({
    mutationFn: async (input: { listId: string; contactId: string }) => {
      const { error } = await supabase
        .from("sms_contact_list_members")
        .delete()
        .eq("list_id", input.listId)
        .eq("contact_id", input.contactId);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: [...qMembers, v.listId] });
      qc.invalidateQueries({ queryKey: [...qMembers, "count", v.listId] });
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async (input: { id?: string; name: string; body: string }) => {
      if (!user) throw new Error("Sign in required");
      if (input.id) {
        const { error } = await supabase
          .from("sms_user_templates")
          .update({ name: input.name.trim(), body: input.body, updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("user_id", user.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("sms_user_templates")
        .insert({ user_id: user.id, name: input.name.trim(), body: input.body })
        .select("id")
        .single();
      if (error) throw error;
      return data!.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...qTemplates] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_user_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...qTemplates] }),
  });

  const createScheduled = useMutation({
    mutationFn: async (input: {
      title?: string;
      message: string;
      merge_fields: Record<string, string>;
      append_opt_out: boolean;
      scheduled_at: string;
      contact_ids: string[];
    }) => {
      if (!user) throw new Error("Sign in required");
      const { data: b, error: bErr } = await supabase
        .from("sms_scheduled_broadcasts")
        .insert({
          user_id: user.id,
          title: input.title?.trim() || null,
          message: input.message.trim(),
          merge_fields: input.merge_fields,
          append_opt_out: input.append_opt_out,
          scheduled_at: input.scheduled_at,
          status: "scheduled",
        })
        .select("id")
        .single();
      if (bErr) throw bErr;
      const bid = b!.id as string;
      const rows = [...new Set(input.contact_ids)].map((contact_id) => ({ broadcast_id: bid, contact_id }));
      if (rows.length === 0) {
        await supabase.from("sms_scheduled_broadcasts").delete().eq("id", bid);
        throw new Error("Select at least one recipient");
      }
      const { error: rErr } = await supabase.from("sms_scheduled_broadcast_recipients").insert(rows);
      if (rErr) {
        await supabase.from("sms_scheduled_broadcasts").delete().eq("id", bid);
        throw rErr;
      }
      return bid;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...qScheduled] }),
  });

  const cancelScheduled = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sms_scheduled_broadcasts")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "scheduled");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...qScheduled] }),
  });

  return {
    createList,
    deleteList,
    setListMembers,
    addListMembers,
    removeListMember,
    saveTemplate,
    deleteTemplate,
    createScheduled,
    cancelScheduled,
    invalidateAll,
  };
}

export async function invokeProcessScheduledSms(): Promise<{ processed: number; results: unknown[] }> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const url = base ? `${base}/functions/v1/process-scheduled-sms` : null;
  if (!url) throw new Error("Missing VITE_SUPABASE_URL");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in required");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || res.statusText);
  return json as { processed: number; results: unknown[] };
}
