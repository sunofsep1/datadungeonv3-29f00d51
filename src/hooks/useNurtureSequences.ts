import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY } from "@/hooks/useActiveNurtureEnrollments";

export type NurtureSequence = Database["public"]["Tables"]["nurture_sequences"]["Row"];
export type NurtureSequenceStep = Database["public"]["Tables"]["nurture_sequence_steps"]["Row"];
export type NurtureSequenceEnrollment = Database["public"]["Tables"]["nurture_sequence_enrollments"]["Row"];

const seqKey = ["nurture_sequences"] as const;
const enrollKey = ["nurture_sequence_enrollments"] as const;

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function useNurtureSequencesList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: seqKey,
    queryFn: async () => {
      if (!user) return [];
      const { data: sequences, error } = await supabase
        .from("nurture_sequences")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const ids = (sequences ?? []).map((s) => s.id);
      if (ids.length === 0) return [];
      const { data: steps, error: e2 } = await supabase
        .from("nurture_sequence_steps")
        .select("*")
        .in("sequence_id", ids)
        .order("sort_order", { ascending: true });
      if (e2) throw e2;
      const bySeq = new Map<string, NurtureSequenceStep[]>();
      for (const s of (steps ?? []) as NurtureSequenceStep[]) {
        const list = bySeq.get(s.sequence_id) ?? [];
        list.push(s);
        bySeq.set(s.sequence_id, list);
      }
      return (sequences as NurtureSequence[]).map((s) => ({
        ...s,
        steps: bySeq.get(s.id) ?? [],
      }));
    },
    enabled: Boolean(user),
  });
}

export function useNurtureEnrollmentsForContact(contactId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...enrollKey, contactId],
    queryFn: async () => {
      if (!user || !contactId) return [];
      const { data, error } = await supabase
        .from("nurture_sequence_enrollments")
        .select("*")
        .eq("contact_id", contactId)
        .is("completed_at", null);
      if (error) throw error;
      return (data ?? []) as NurtureSequenceEnrollment[];
    },
    enabled: Boolean(user && contactId),
  });
}

export function useCreateNurtureSequence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      steps: {
        offset_days: number;
        step_type: "task" | "email" | "prompt";
        title: string;
        body?: string;
        email_subject?: string;
        email_html?: string;
      }[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: seq, error } = await supabase
        .from("nurture_sequences")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          description: input.description?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      const sid = (seq as NurtureSequence).id;
      if (input.steps.length > 0) {
        const rows = input.steps.map((s, i) => ({
          sequence_id: sid,
          sort_order: i,
          offset_days: s.offset_days,
          step_type: s.step_type,
          title: s.title.trim(),
          body: s.body?.trim() || null,
          email_subject: s.email_subject?.trim() || null,
          email_html: s.email_html?.trim() || null,
        }));
        const { error: e2 } = await supabase.from("nurture_sequence_steps").insert(rows);
        if (e2) throw e2;
      }
      return seq as NurtureSequence;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: seqKey }),
  });
}

export function useUpdateNurtureSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      description?: string | null;
      is_active?: boolean;
      steps: {
        offset_days: number;
        step_type: "task" | "email" | "prompt";
        title: string;
        body?: string;
        email_subject?: string;
        email_html?: string;
      }[];
    }) => {
      const { error } = await supabase
        .from("nurture_sequences")
        .update({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
        })
        .eq("id", input.id);
      if (error) throw error;

      const { error: delErr } = await supabase.from("nurture_sequence_steps").delete().eq("sequence_id", input.id);
      if (delErr) throw delErr;

      if (input.steps.length > 0) {
        const rows = input.steps.map((s, i) => ({
          sequence_id: input.id,
          sort_order: i,
          offset_days: s.offset_days,
          step_type: s.step_type,
          title: s.title.trim(),
          body: s.body?.trim() || null,
          email_subject: s.email_subject?.trim() || null,
          email_html: s.email_html?.trim() || null,
        }));
        const { error: insErr } = await supabase.from("nurture_sequence_steps").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seqKey });
      queryClient.invalidateQueries({ queryKey: enrollKey });
      queryClient.invalidateQueries({ queryKey: ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY });
    },
  });
}

export function useDeleteNurtureSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nurture_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: seqKey }),
  });
}

export function useEnrollNurtureSequence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      contact_id: string;
      sequence_id: string;
      pause_followup_cadence?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: steps, error: se } = await supabase
        .from("nurture_sequence_steps")
        .select("*")
        .eq("sequence_id", input.sequence_id)
        .order("sort_order", { ascending: true });
      if (se) throw se;
      const list = (steps ?? []) as NurtureSequenceStep[];
      const started = new Date();
      const firstOffset = list[0]?.offset_days ?? 0;
      const nextAt = addDays(started, firstOffset);

      const { data, error } = await supabase
        .from("nurture_sequence_enrollments")
        .insert({
          contact_id: input.contact_id,
          sequence_id: input.sequence_id,
          user_id: user.id,
          current_step_index: 0,
          started_at: started.toISOString(),
          next_step_at: nextAt.toISOString(),
          pause_followup_cadence: input.pause_followup_cadence ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as NurtureSequenceEnrollment;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: enrollKey });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY });
    },
  });
}

export function useCompleteNurtureEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { enrollment_id: string; contact_id: string }) => {
      const { error } = await supabase
        .from("nurture_sequence_enrollments")
        .update({ completed_at: new Date().toISOString(), next_step_at: null })
        .eq("id", input.enrollment_id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: enrollKey });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      queryClient.invalidateQueries({ queryKey: ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY });
    },
  });
}
