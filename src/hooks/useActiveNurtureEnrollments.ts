import { useQuery } from "@tanstack/react-query";
import { isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getContactDisplayName } from "@/hooks/useContacts";

export type ActiveNurtureEnrollmentItem = {
  id: string;
  contact_id: string;
  sequence_id: string;
  next_step_at: string | null;
  pause_followup_cadence: boolean;
  pause_reason: string | null;
  current_step_index: number;
  total_steps: number;
  started_at: string;
  updated_at: string;
  contactName: string;
  sequenceName: string;
  /** Title of the step that will run next (runner uses current_step_index) */
  next_step_title: string | null;
  next_step_type: string | null;
};

export type NurtureSequenceDashboardSummary = {
  activeTotal: number;
  dueNow: number;
  dueToday: number;
  dueSoon24h: number;
};

/** Invalidate from enroll/complete mutations so the dashboard widget stays fresh. */
export const ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY = ["nurture_sequence_enrollments", "active_dashboard"] as const;

function buildStepsBySequence(
  stepRows: Array<{
    sequence_id: string;
    sort_order: number;
    title: string;
    step_type: string | null;
  }>
): Map<string, Array<{ title: string; step_type: string | null }>> {
  const map = new Map<string, Array<{ sort_order: number; title: string; step_type: string | null }>>();
  for (const row of stepRows) {
    const list = map.get(row.sequence_id) ?? [];
    list.push({ sort_order: row.sort_order, title: row.title, step_type: row.step_type });
    map.set(row.sequence_id, list);
  }
  const out = new Map<string, Array<{ title: string; step_type: string | null }>>();
  for (const [sid, list] of map) {
    list.sort((a, b) => a.sort_order - b.sort_order);
    out.set(
      sid,
      list.map((x) => ({ title: x.title, step_type: x.step_type }))
    );
  }
  return out;
}

/**
 * Active nurture enrollments for the current user: contact + sequence names, progress,
 * and the next step preview. Optimized for dashboard scale (batch step fetch).
 */
export function useActiveNurtureEnrollments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...ACTIVE_NURTURE_ENROLLMENTS_QUERY_KEY, user?.id],
    queryFn: async (): Promise<{ items: ActiveNurtureEnrollmentItem[]; summary: NurtureSequenceDashboardSummary }> => {
      if (!user) return { items: [], summary: { activeTotal: 0, dueNow: 0, dueToday: 0, dueSoon24h: 0 } };

      const { data: rows, error } = await supabase
        .from("nurture_sequence_enrollments")
        .select(
          "id, contact_id, sequence_id, next_step_at, pause_followup_cadence, pause_reason, current_step_index, started_at, updated_at"
        )
        .eq("user_id", user.id)
        .is("completed_at", null);
      if (error) throw error;

      const list = (rows ?? []) as Array<{
        id: string;
        contact_id: string;
        sequence_id: string;
        next_step_at: string | null;
        pause_followup_cadence: boolean;
        pause_reason: string | null;
        current_step_index: number;
        started_at: string;
        updated_at: string;
      }>;

      if (list.length === 0) {
        return { items: [], summary: { activeTotal: 0, dueNow: 0, dueToday: 0, dueSoon24h: 0 } };
      }

      const cIds = [...new Set(list.map((r) => r.contact_id))];
      const sIds = [...new Set(list.map((r) => r.sequence_id))];

      const [{ data: cRows, error: cErr }, { data: sRows, error: sErr }, { data: stepRows, error: stErr }] = await Promise.all([
        supabase.from("contacts").select("id, name, first_name, last_name").in("id", cIds),
        supabase.from("nurture_sequences").select("id, name").in("id", sIds),
        supabase
          .from("nurture_sequence_steps")
          .select("sequence_id, sort_order, title, step_type")
          .in("sequence_id", sIds),
      ]);
      if (cErr) throw cErr;
      if (sErr) throw sErr;
      if (stErr) throw stErr;

      const cMap = new Map(
        (cRows ?? []).map((c) => {
          const dn = getContactDisplayName(c as Record<string, unknown>);
          return [c.id, dn === "—" ? "Contact" : dn] as const;
        })
      );
      const sMap = new Map((sRows ?? []).map((s) => [s.id, s.name ?? "Sequence"]));
      const stepsBySeq = buildStepsBySequence(
        (stepRows ?? []) as Array<{
          sequence_id: string;
          sort_order: number;
          title: string;
          step_type: string | null;
        }>
      );

      const now = Date.now();
      const MS_24H = 24 * 60 * 60 * 1000;

      const items: ActiveNurtureEnrollmentItem[] = list.map((r) => {
        const steps = stepsBySeq.get(r.sequence_id) ?? [];
        const total_steps = steps.length;
        const idx = Math.min(Math.max(0, r.current_step_index), Math.max(0, total_steps - 1));
        const next = total_steps > 0 ? steps[idx] : null;

        return {
          id: r.id,
          contact_id: r.contact_id,
          sequence_id: r.sequence_id,
          next_step_at: r.next_step_at,
          pause_followup_cadence: r.pause_followup_cadence,
          pause_reason: r.pause_reason ?? null,
          current_step_index: r.current_step_index,
          total_steps,
          started_at: r.started_at,
          updated_at: r.updated_at,
          contactName: cMap.get(r.contact_id) ?? "Contact",
          sequenceName: sMap.get(r.sequence_id) ?? "Sequence",
          next_step_title: next?.title ?? null,
          next_step_type: next?.step_type ?? null,
        };
      });

      items.sort((a, b) => {
        if (!a.next_step_at && !b.next_step_at) return 0;
        if (!a.next_step_at) return 1;
        if (!b.next_step_at) return -1;
        return new Date(a.next_step_at).getTime() - new Date(b.next_step_at).getTime();
      });

      let dueNow = 0;
      let dueToday = 0;
      let dueSoon24h = 0;

      for (const r of list) {
        if (!r.next_step_at) continue;
        const t = new Date(r.next_step_at).getTime();
        const when = new Date(r.next_step_at);
        if (t <= now) dueNow++;
        if (isSameDay(when, new Date())) dueToday++;
        if (t > now && t <= now + MS_24H) dueSoon24h++;
      }

      const summary: NurtureSequenceDashboardSummary = {
        activeTotal: items.length,
        dueNow,
        dueToday,
        dueSoon24h,
      };

      return { items, summary };
    },
    enabled: Boolean(user),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
}
