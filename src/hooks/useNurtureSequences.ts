import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logContactActivity, invalidateContactInteractions } from "@/lib/contactActivityLog";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY } from "@/hooks/useActiveNurtureEnrollments";

export type NurtureSequence = Database["public"]["Tables"]["nurture_sequences"]["Row"];
export type NurtureSequenceStep = Database["public"]["Tables"]["nurture_sequence_steps"]["Row"];
export type NurtureSequenceEnrollment = Database["public"]["Tables"]["nurture_sequence_enrollments"]["Row"];
export type NurtureStepRunStatus = "pending" | "completed" | "skipped" | "failed";

export interface NurtureStepRun {
  id: string;
  enrollment_id: string;
  step_index: number;
  step_id: string | null;
  status: NurtureStepRunStatus;
  task_id: string | null;
  activated_at: string;
  completed_at: string | null;
  error: string | null;
}

const seqKey = ["nurture_sequences"] as const;
const enrollKey = ["nurture_sequence_enrollments"] as const;
const stepRunsKey = ["nurture_sequence_step_runs"] as const;

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

export function useCompletedNurtureEnrollments(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...enrollKey, "completed", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("nurture_sequence_enrollments")
        .select("id, sequence_id, contact_id, completed_at, updated_at")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;

      const rows = data ?? [];
      const sequenceIds = [...new Set(rows.map((r) => r.sequence_id).filter(Boolean))];
      const contactIds = [...new Set(rows.map((r) => r.contact_id).filter(Boolean))];

      const [{ data: sequences }, { data: contacts }] = await Promise.all([
        sequenceIds.length
          ? supabase.from("nurture_sequences").select("id, name").in("id", sequenceIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
        contactIds.length
          ? supabase.from("contacts").select("id, name, first_name, last_name").in("id", contactIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name?: string | null; first_name?: string | null; last_name?: string | null }> }),
      ]);

      const seqMap = new Map((sequences ?? []).map((s) => [s.id, s.name]));
      const contactMap = new Map(
        (contacts ?? []).map((c) => {
          const fullName = c.name || [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "Contact";
          return [c.id, fullName];
        }),
      );

      return rows.map((r) => ({
        ...r,
        sequence_name: seqMap.get(r.sequence_id) ?? "Sequence",
        contact_name: contactMap.get(r.contact_id) ?? "Contact",
      }));
    },
    enabled: Boolean(user),
  });
}

export function usePendingStepRunsByTaskIds(taskIds?: string[]) {
  const { user } = useAuth();
  const ids = (taskIds ?? []).filter(Boolean);

  return useQuery({
    queryKey: [...stepRunsKey, "task_ids", ...ids],
    queryFn: async (): Promise<NurtureStepRun[]> => {
      if (!user || ids.length === 0) return [];
      const { data, error } = await supabase
        .from("nurture_sequence_step_runs" as never)
        .select("*")
        .eq("status", "pending")
        .in("task_id", ids);
      if (error) throw error;
      return (data ?? []) as NurtureStepRun[];
    },
    enabled: Boolean(user && ids.length > 0),
  });
}

export function useCompleteNurtureStepAndAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      enrollment_id: string;
      step_run_id: string;
      contact_id: string;
      outcome?: "completed" | "skipped";
      engagement_note?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("complete_nurture_step_and_advance" as never, {
        p_enrollment_id: input.enrollment_id,
        p_step_run_id: input.step_run_id,
        p_outcome: input.outcome ?? "completed",
      } as Record<string, unknown>);
      if (error) throw error;
      await logContactActivity({
        contactId: input.contact_id,
        subject: input.outcome === "skipped" ? "Nurture step skipped" : "Nurture step completed",
        body: input.engagement_note?.trim() ? input.engagement_note.trim() : undefined,
      });
      return data;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: stepRunsKey });
      queryClient.invalidateQueries({ queryKey: enrollKey });
      queryClient.invalidateQueries({ queryKey: ["contact_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      queryClient.invalidateQueries({ queryKey: ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY });
      invalidateContactInteractions(queryClient, v.contact_id);
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seqKey });
      queryClient.invalidateQueries({ queryKey: enrollKey });
      queryClient.invalidateQueries({ queryKey: ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY });
    },
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
          pause_followup_cadence: input.pause_followup_cadence ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      const row = data as NurtureSequenceEnrollment;
      let seqName: string | undefined;
      try {
        const { data: seq } = await supabase
          .from("nurture_sequences")
          .select("name")
          .eq("id", input.sequence_id)
          .maybeSingle();
        seqName = (seq as { name?: string } | null)?.name;
      } catch {
        /* ignore */
      }
      await logContactActivity({
        contactId: input.contact_id,
        subject: "Nurture sequence started",
        body: seqName ? `Sequence: ${seqName}` : undefined,
      });
      return row;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: enrollKey });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY });
      invalidateContactInteractions(queryClient, v.contact_id);
    },
  });
}

/**
 * Mark the current sequence step as done and move to the next (or finish the enrollment).
 * Uses the same next_step_at schedule as the automated runner (offsets from enrollment start).
 */
export function useAdvanceNurtureEnrollmentStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { enrollment_id: string; contact_id: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: enrollment, error: e1 } = await supabase
        .from("nurture_sequence_enrollments")
        .select("*")
        .eq("id", input.enrollment_id)
        .eq("contact_id", input.contact_id)
        .eq("user_id", user.id)
        .is("completed_at", null)
        .single();
      if (e1) throw e1;
      const en = enrollment as NurtureSequenceEnrollment;

      const { data: stepRows, error: e2 } = await supabase
        .from("nurture_sequence_steps")
        .select("*")
        .eq("sequence_id", en.sequence_id)
        .order("sort_order", { ascending: true });
      if (e2) throw e2;
      const list = (stepRows ?? []) as NurtureSequenceStep[];
      if (list.length === 0) throw new Error("Sequence has no steps");

      const idx = en.current_step_index;
      if (idx >= list.length) {
        await supabase
          .from("nurture_sequence_enrollments")
          .update({
            completed_at: new Date().toISOString(),
            next_step_at: null,
            current_step_index: list.length,
          })
          .eq("id", input.enrollment_id);
        let seqName: string | undefined;
        const { data: seq } = await supabase
          .from("nurture_sequences")
          .select("name")
          .eq("id", en.sequence_id)
          .maybeSingle();
        seqName = (seq as { name?: string } | null)?.name;
        await logContactActivity({
          contactId: input.contact_id,
          subject: "Nurture sequence completed",
          body: seqName ? `Sequence: ${seqName}` : undefined,
        });
        return { finished: true as const };
      }

      const completedStep = list[idx];
      const nextIndex = idx + 1;
      const startedAt = new Date(en.started_at);

      if (nextIndex >= list.length) {
        const { error: upErr } = await supabase
          .from("nurture_sequence_enrollments")
          .update({
            completed_at: new Date().toISOString(),
            next_step_at: null,
            current_step_index: nextIndex,
          })
          .eq("id", input.enrollment_id);
        if (upErr) throw upErr;
      } else {
        const nextStep = list[nextIndex];
        const nextAt = addDays(startedAt, nextStep.offset_days);
        const { error: upErr } = await supabase
          .from("nurture_sequence_enrollments")
          .update({
            current_step_index: nextIndex,
            next_step_at: nextAt.toISOString(),
          })
          .eq("id", input.enrollment_id);
        if (upErr) throw upErr;
      }

      let seqName: string | undefined;
      const { data: seq } = await supabase
        .from("nurture_sequences")
        .select("name")
        .eq("id", en.sequence_id)
        .maybeSingle();
      seqName = (seq as { name?: string } | null)?.name;

      await logContactActivity({
        contactId: input.contact_id,
        subject: "Nurture step completed (manual)",
        body: [seqName ? `Sequence: ${seqName}` : null, completedStep?.title ? `Step: ${completedStep.title}` : null]
          .filter(Boolean)
          .join(" · "),
      });

      return { finished: nextIndex >= list.length };
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: enrollKey });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      queryClient.invalidateQueries({ queryKey: ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY });
      invalidateContactInteractions(queryClient, v.contact_id);
    },
  });
}

export function useCompleteNurtureEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { enrollment_id: string; contact_id: string }) => {
      const { data: en } = await supabase
        .from("nurture_sequence_enrollments")
        .select("sequence_id")
        .eq("id", input.enrollment_id)
        .maybeSingle();
      const { error } = await supabase
        .from("nurture_sequence_enrollments")
        .update({ completed_at: new Date().toISOString(), next_step_at: null })
        .eq("id", input.enrollment_id);
      if (error) throw error;
      let seqName: string | undefined;
      if (en?.sequence_id) {
        const { data: seq } = await supabase
          .from("nurture_sequences")
          .select("name")
          .eq("id", en.sequence_id)
          .maybeSingle();
        seqName = (seq as { name?: string } | null)?.name;
      }
      await logContactActivity({
        contactId: input.contact_id,
        subject: "Nurture sequence completed",
        body: seqName ? `Sequence: ${seqName}` : undefined,
      });
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: enrollKey });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      queryClient.invalidateQueries({ queryKey: ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY });
      invalidateContactInteractions(queryClient, v.contact_id);
    },
  });
}

export function useSetNurtureEnrollmentCadencePaused() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { enrollment_id: string; pause_followup_cadence: boolean; pause_reason?: string | null }) => {
      const { data: en, error: eErr } = await supabase
        .from("nurture_sequence_enrollments")
        .select("contact_id")
        .eq("id", input.enrollment_id)
        .maybeSingle();

      if (eErr) throw eErr;
      if (!en?.contact_id) throw new Error("Enrollment not found or not accessible");

      const { data: seqRef } = await supabase
        .from("nurture_sequence_enrollments")
        .select("sequence_id")
        .eq("id", input.enrollment_id)
        .maybeSingle();
      let seqName: string | undefined;
      if (seqRef?.sequence_id) {
        const { data: seq } = await supabase
          .from("nurture_sequences")
          .select("name")
          .eq("id", seqRef.sequence_id)
          .maybeSingle();
        seqName = (seq as { name?: string } | null)?.name;
      }

      const { error } = await supabase
        .from("nurture_sequence_enrollments")
        .update({ pause_followup_cadence: input.pause_followup_cadence })
        .eq("id", input.enrollment_id);

      if (error) throw error;

      await logContactActivity({
        contactId: en.contact_id as string,
        subject: input.pause_followup_cadence ? "Nurture cadence paused" : "Nurture cadence resumed",
        body: [
          seqName ? `Sequence: ${seqName}` : null,
          input.pause_followup_cadence && input.pause_reason?.trim() ? `Reason: ${input.pause_reason.trim()}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });

      return { contact_id: en.contact_id as string };
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: enrollKey });
      queryClient.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY });
      invalidateContactInteractions(queryClient, v.contact_id);
    },
  });
}
