import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import { STARTER_ACTIVITY_SCHEDULES } from "@/lib/starterActivitySchedules";
import type { ActivityScheduleAppliesTo, ActivityScheduleStepType } from "@/lib/activitySchedule";

const KEYS = ["activity_schedules"] as const;

function isMissingTable(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: string }).code === "42P01"
  );
}

export type ActivityScheduleTemplate = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  applies_to: ActivityScheduleAppliesTo;
  created_at: string;
  updated_at: string;
};

export type ActivityScheduleTemplateStep = {
  id: string;
  template_id: string;
  sort_order: number;
  offset_days: number;
  step_type: string;
  title: string;
  body: string | null;
};

export type ActivityScheduleInstance = {
  id: string;
  user_id: string;
  template_id: string;
  applies_to: ActivityScheduleAppliesTo;
  contact_id: string | null;
  listing_id: string | null;
  applied_at: string;
  status: string;
  template?: { name: string } | null;
};

export type ActivityScheduleStepRun = {
  id: string;
  instance_id: string;
  sort_order: number;
  step_type: string;
  title: string;
  body: string | null;
  due_at: string;
  completed_at: string | null;
  contact_task_id: string | null;
};

async function seedStarterTemplates(userId: string): Promise<void> {
  for (const starter of STARTER_ACTIVITY_SCHEDULES) {
    const { data: tpl, error: tplErr } = await supabase
      .from("activity_schedule_templates")
      .insert({
        user_id: userId,
        name: starter.name,
        description: starter.description,
        applies_to: starter.applies_to,
      })
      .select("id")
      .single();
    if (tplErr) throw tplErr;

    const rows = starter.steps.map((s, i) => ({
      template_id: tpl.id,
      sort_order: i,
      offset_days: s.offset_days,
      step_type: s.step_type,
      title: s.title,
      body: s.body ?? null,
    }));
    const { error: stepsErr } = await supabase.from("activity_schedule_template_steps").insert(rows);
    if (stepsErr) throw stepsErr;
  }
}

export function useActivityScheduleTemplates(appliesTo?: ActivityScheduleAppliesTo) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useQuery({
    queryKey: [...KEYS, "templates", user?.id, appliesTo ?? "all"],
    queryFn: async (): Promise<ActivityScheduleTemplate[]> => {
      if (!user) return [];
      const { count, error: countErr } = await supabase
        .from("activity_schedule_templates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (countErr) {
        if (isMissingTable(countErr)) return [];
        throw new Error(supabaseErrorMessage(countErr));
      }
      if ((count ?? 0) === 0) {
        await seedStarterTemplates(user.id);
        void qc.invalidateQueries({ queryKey: KEYS });
      }

      let q = supabase
        .from("activity_schedule_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (appliesTo) q = q.eq("applies_to", appliesTo);
      const { data, error } = await q;
      if (error) {
        if (isMissingTable(error)) return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ActivityScheduleTemplate[];
    },
    enabled: Boolean(user),
  });
}

export function useActivityScheduleTemplateSteps(templateId: string | undefined) {
  return useQuery({
    queryKey: [...KEYS, "template-steps", templateId],
    enabled: Boolean(templateId),
    queryFn: async (): Promise<ActivityScheduleTemplateStep[]> => {
      const { data, error } = await supabase
        .from("activity_schedule_template_steps")
        .select("*")
        .eq("template_id", templateId!)
        .order("sort_order");
      if (error) {
        if (isMissingTable(error)) return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ActivityScheduleTemplateStep[];
    },
  });
}

export function useEntityActivitySchedules(input: {
  appliesTo: ActivityScheduleAppliesTo;
  contactId?: string;
  listingId?: string;
}) {
  const entityId = input.appliesTo === "contact" ? input.contactId : input.listingId;

  return useQuery({
    queryKey: [...KEYS, "instances", input.appliesTo, entityId],
    enabled: Boolean(entityId),
    queryFn: async (): Promise<ActivityScheduleInstance[]> => {
      let q = supabase
        .from("activity_schedule_instances")
        .select("*, activity_schedule_templates(name)")
        .order("applied_at", { ascending: false });
      if (input.appliesTo === "contact") q = q.eq("contact_id", input.contactId!);
      else q = q.eq("listing_id", input.listingId!);
      const { data, error } = await q;
      if (error) {
        if (isMissingTable(error)) return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []).map((row) => {
        const r = row as ActivityScheduleInstance & {
          activity_schedule_templates?: { name: string } | { name: string }[] | null;
        };
        const tpl = r.activity_schedule_templates;
        const templateName = Array.isArray(tpl) ? tpl[0]?.name : tpl?.name;
        const { activity_schedule_templates: _t, ...rest } = r;
        return { ...rest, template: templateName ? { name: templateName } : null };
      });
    },
  });
}

export function useActivityScheduleStepRuns(instanceId: string | undefined) {
  return useQuery({
    queryKey: [...KEYS, "step-runs", instanceId],
    enabled: Boolean(instanceId),
    queryFn: async (): Promise<ActivityScheduleStepRun[]> => {
      const { data, error } = await supabase
        .from("activity_schedule_step_runs")
        .select("*")
        .eq("instance_id", instanceId!)
        .order("sort_order");
      if (error) {
        if (isMissingTable(error)) return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ActivityScheduleStepRun[];
    },
  });
}

export function useApplyActivitySchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      templateId: string;
      contactId?: string;
      listingId?: string;
    }) => {
      const { data, error } = await supabase.rpc("apply_activity_schedule", {
        p_template_id: input.templateId,
        p_contact_id: input.contactId ?? null,
        p_listing_id: input.listingId ?? null,
      });
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS });
      void qc.invalidateQueries({ queryKey: ["contact_tasks"] });
    },
  });
}

export function useCompleteActivityScheduleStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stepRunId: string) => {
      const { error } = await supabase.rpc("complete_activity_schedule_step", {
        p_step_run_id: stepRunId,
      });
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS });
      void qc.invalidateQueries({ queryKey: ["contact_tasks"] });
    },
  });
}

export function useCancelActivityScheduleInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { error } = await supabase
        .from("activity_schedule_instances")
        .update({ status: "cancelled" })
        .eq("id", instanceId);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS });
    },
  });
}

export type ActivityScheduleStepDraft = {
  /** Existing DB id, or `new-*` for unsaved rows */
  id: string;
  offset_days: number;
  step_type: ActivityScheduleStepType;
  title: string;
  body: string;
};

export function useCreateActivityScheduleTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string | null;
      applies_to: ActivityScheduleAppliesTo;
      steps?: ActivityScheduleStepDraft[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: tpl, error } = await supabase
        .from("activity_schedule_templates")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          applies_to: input.applies_to,
        })
        .select("id")
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      await persistTemplateSteps(tpl.id, input.steps ?? []);
      return tpl.id as string;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS }),
  });
}

export function useSaveActivityScheduleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      description?: string | null;
      steps: ActivityScheduleStepDraft[];
    }) => {
      const { error: tplErr } = await supabase
        .from("activity_schedule_templates")
        .update({
          name: input.name.trim(),
          description: input.description?.trim() || null,
        })
        .eq("id", input.id);
      if (tplErr) throw new Error(supabaseErrorMessage(tplErr));
      await persistTemplateSteps(input.id, input.steps);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS }),
  });
}

export function useDeleteActivityScheduleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { count, error: countErr } = await supabase
        .from("activity_schedule_instances")
        .select("id", { count: "exact", head: true })
        .eq("template_id", templateId);
      if (countErr) throw new Error(supabaseErrorMessage(countErr));
      if ((count ?? 0) > 0) {
        throw new Error("This schedule has been applied to listings or contacts and cannot be deleted.");
      }
      const { error } = await supabase.from("activity_schedule_templates").delete().eq("id", templateId);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS }),
  });
}

export function useDuplicateActivityScheduleTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data: tpl, error: tplErr } = await supabase
        .from("activity_schedule_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      if (tplErr) throw new Error(supabaseErrorMessage(tplErr));

      const { data: steps, error: stepsErr } = await supabase
        .from("activity_schedule_template_steps")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      if (stepsErr) throw new Error(supabaseErrorMessage(stepsErr));

      const source = tpl as ActivityScheduleTemplate;
      const { data: created, error: createErr } = await supabase
        .from("activity_schedule_templates")
        .insert({
          user_id: user.id,
          name: `${source.name} (copy)`,
          description: source.description,
          applies_to: source.applies_to,
        })
        .select("id")
        .single();
      if (createErr) throw new Error(supabaseErrorMessage(createErr));

      const rows = (steps ?? []).map((s, i) => ({
        template_id: created.id,
        sort_order: i,
        offset_days: s.offset_days,
        step_type: s.step_type,
        title: s.title,
        body: s.body,
      }));
      if (rows.length) {
        const { error: insErr } = await supabase.from("activity_schedule_template_steps").insert(rows);
        if (insErr) throw new Error(supabaseErrorMessage(insErr));
      }
      return created.id as string;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS }),
  });
}

async function persistTemplateSteps(templateId: string, steps: ActivityScheduleStepDraft[]) {
  const { data: existing, error: loadErr } = await supabase
    .from("activity_schedule_template_steps")
    .select("id")
    .eq("template_id", templateId);
  if (loadErr) throw new Error(supabaseErrorMessage(loadErr));

  const keepIds = new Set(
    steps.filter((s) => !s.id.startsWith("new-")).map((s) => s.id),
  );
  const toDelete = (existing ?? [])
    .map((r) => r.id as string)
    .filter((id) => !keepIds.has(id));
  if (toDelete.length) {
    const { error: delErr } = await supabase
      .from("activity_schedule_template_steps")
      .delete()
      .in("id", toDelete);
    if (delErr) throw new Error(supabaseErrorMessage(delErr));
  }

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!;
    const title = s.title.trim();
    if (!title) continue;
    const row = {
      sort_order: i,
      offset_days: Math.max(0, Math.min(3650, Math.floor(s.offset_days))),
      step_type: s.step_type,
      title,
      body: s.body.trim() || null,
    };
    if (s.id.startsWith("new-")) {
      const { error } = await supabase
        .from("activity_schedule_template_steps")
        .insert({ ...row, template_id: templateId });
      if (error) throw new Error(supabaseErrorMessage(error));
    } else {
      const { error } = await supabase
        .from("activity_schedule_template_steps")
        .update(row)
        .eq("id", s.id);
      if (error) throw new Error(supabaseErrorMessage(error));
    }
  }
}
