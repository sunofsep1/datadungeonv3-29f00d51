import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type ContactTask = Database["public"]["Tables"]["contact_tasks"]["Row"];

const baseKey = ["contact_tasks"] as const;

export function useContactTasks(contactId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...baseKey, contactId ?? "all"],
    queryFn: async (): Promise<ContactTask[]> => {
      if (!user) return [];
      let q = supabase.from("contact_tasks").select("*").order("due_at", { ascending: true, nullsFirst: false });
      if (contactId) q = q.eq("contact_id", contactId);
      else q = q.eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ContactTask[];
    },
    enabled: Boolean(user),
  });
}

export function useOpenContactTasksForUser() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...baseKey, "open", user?.id],
    queryFn: async (): Promise<ContactTask[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("contact_tasks")
        .select("*")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ContactTask[];
    },
    enabled: Boolean(user),
  });
}

export function useCreateContactTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      contact_id: string;
      title: string;
      notes?: string | null;
      due_at?: string | null;
      sequence_enrollment_id?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("contact_tasks")
        .insert({
          contact_id: input.contact_id,
          user_id: user.id,
          title: input.title.trim(),
          notes: input.notes?.trim() || null,
          due_at: input.due_at ?? null,
          sequence_enrollment_id: input.sequence_enrollment_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ContactTask;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: baseKey });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContactTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      contact_id: string;
      title?: string;
      notes?: string | null;
      due_at?: string | null;
      completed_at?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.due_at !== undefined) updates.due_at = input.due_at;
      if (input.completed_at !== undefined) updates.completed_at = input.completed_at;

      const { data, error } = await supabase.from("contact_tasks").update(updates).eq("id", input.id).select().single();
      if (error) throw error;
      return data as ContactTask;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: baseKey });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContactTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; contact_id: string }) => {
      const { error } = await supabase.from("contact_tasks").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: baseKey });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
    },
  });
}
