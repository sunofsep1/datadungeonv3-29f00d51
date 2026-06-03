import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type CrmWorkflow = Tables<"crm_workflows">;
export type CrmWorkflowStep = Tables<"crm_workflow_steps">;
export type CrmWorkflowEnrollment = Tables<"crm_workflow_enrollments">;

function addMinutesToNow(minutes: number): string {
  const d = new Date();
  d.setUTCMinutes(d.getUTCMinutes() + Math.min(525600, Math.max(0, Math.floor(minutes))));
  return d.toISOString();
}

const KEYS = [["crm_workflows"]] as const;

export function useCrmWorkflowsList() {
  return useQuery({
    queryKey: [...KEYS, "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_workflows")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmWorkflow[];
    },
  });
}

export function useCrmWorkflowSteps(workflowId: string | undefined) {
  return useQuery({
    queryKey: [...KEYS, "steps", workflowId],
    enabled: Boolean(workflowId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_workflow_steps")
        .select("*")
        .eq("workflow_id", workflowId!)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return data as CrmWorkflowStep[];
    },
  });
}

export function useCrmWorkflowEnrollmentsForWorkflow(workflowId: string | undefined) {
  return useQuery({
    queryKey: [...KEYS, "enrollments", workflowId],
    enabled: Boolean(workflowId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_workflow_enrollments")
        .select("*")
        .eq("workflow_id", workflowId!)
        .order("enrolled_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as CrmWorkflowEnrollment[];
    },
  });
}

export type CrmWorkflowStepRunRow = {
  id: string;
  enrollment_id: string;
  workflow_id: string;
  user_id: string;
  step_order: number;
  action_type: string;
  status: string;
  detail: string | null;
  branch_taken: boolean | null;
  executed_at: string;
};

export function useCrmWorkflowStepRunsForWorkflow(workflowId: string | undefined) {
  return useQuery({
    queryKey: [...KEYS, "step-runs", workflowId],
    enabled: Boolean(workflowId),
    queryFn: async (): Promise<CrmWorkflowStepRunRow[]> => {
      const { data, error } = await supabase
        .from("crm_workflow_step_runs")
        .select("id, enrollment_id, workflow_id, user_id, step_order, action_type, status, detail, branch_taken, executed_at")
        .eq("workflow_id", workflowId!)
        .order("executed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as CrmWorkflowStepRunRow[];
    },
    staleTime: 15_000,
  });
}

export function useCreateSampleCrmWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const row: TablesInsert<"crm_workflows"> = {
        user_id: user.id,
        name: "Sample: notify then task",
        description:
          "Step 1 — in-app notification immediately. Step 2 — contact task after 24h. Activate, enroll a contact from Settings.",
        trigger_type: "manual",
        trigger_object: "contact",
        trigger_conditions: {},
        is_active: true,
      };

      const { data: wf, error: wErr } = await supabase.from("crm_workflows").insert(row).select("id").single();
      if (wErr) throw wErr;
      if (!wf?.id) throw new Error("Workflow insert failed");

      const steps: TablesInsert<"crm_workflow_steps">[] = [
        {
          workflow_id: wf.id,
          step_order: 0,
          action_type: "notify_user",
          delay_minutes: 0,
          action_config: {
            title: "Workflow started",
            body: "This contact entered the sample CRM workflow.",
            priority: "info",
          },
        },
        {
          workflow_id: wf.id,
          step_order: 1,
          action_type: "create_task",
          delay_minutes: 1440,
          action_config: {
            title: "Sample workflow follow-up",
            notes: "Created automatically by process-workflows.",
            due_days: 1,
          },
        },
      ];

      const { error: sErr } = await supabase.from("crm_workflow_steps").insert(steps);
      if (sErr) throw sErr;
      return wf.id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS });
      void qc.invalidateQueries({ queryKey: [...KEYS, "step-runs"] });
    },
  });
}

/** Safe action types for the in-app form step builder (no branching / SMS / email here). */
export const CRM_WORKFLOW_STEP_ACTIONS_FORM = [
  "wait_delay",
  "noop",
  "notify_user",
  "create_task",
] as const;

function defaultActionConfig(actionType: string): TablesInsert<"crm_workflow_steps">["action_config"] {
  switch (actionType) {
    case "wait_delay":
      return {};
    case "noop":
      return {};
    case "notify_user":
      return {
        title: "Workflow step",
        body: "Automated notification from your CRM workflow.",
        priority: "info",
      };
    case "create_task":
      return {
        title: "Follow-up task",
        notes: "Created from the workflow step editor.",
        due_days: 1,
      };
    default:
      return {};
  }
}

export function useAppendCrmWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workflowId,
      actionType,
      delayMinutes,
    }: {
      workflowId: string;
      actionType: string;
      delayMinutes: number;
    }) => {
      const { data: maxRow, error: maxErr } = await supabase
        .from("crm_workflow_steps")
        .select("step_order")
        .eq("workflow_id", workflowId)
        .order("step_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const nextOrder = typeof maxRow?.step_order === "number" ? maxRow.step_order + 1 : 0;

      const row: TablesInsert<"crm_workflow_steps"> = {
        workflow_id: workflowId,
        step_order: nextOrder,
        action_type: actionType,
        delay_minutes: Math.min(525600, Math.max(0, Math.floor(delayMinutes))),
        action_config: defaultActionConfig(actionType),
        branch_condition: {},
      };
      const { error } = await supabase.from("crm_workflow_steps").insert(row);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: KEYS });
      void qc.invalidateQueries({ queryKey: [...KEYS, "steps", variables.workflowId] });
      void qc.invalidateQueries({ queryKey: [...KEYS, "step-runs", variables.workflowId] });
    },
  });
}

export function useUpdateCrmWorkflowStepDelay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stepId,
      workflowId,
      delayMinutes,
    }: {
      stepId: string;
      workflowId: string;
      delayMinutes: number;
    }) => {
      const bounded = Math.min(525600, Math.max(0, Math.floor(delayMinutes)));
      const { error } = await supabase
        .from("crm_workflow_steps")
        .update({ delay_minutes: bounded })
        .eq("id", stepId);
      if (error) throw error;
      return { workflowId };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: KEYS });
      void qc.invalidateQueries({ queryKey: [...KEYS, "steps", data.workflowId] });
    },
  });
}

export function useDuplicateCrmWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workflowId,
      sourceStep,
    }: {
      workflowId: string;
      sourceStep: CrmWorkflowStep;
    }) => {
      const { data: maxRow, error: maxErr } = await supabase
        .from("crm_workflow_steps")
        .select("step_order")
        .eq("workflow_id", workflowId)
        .order("step_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const nextOrder = typeof maxRow?.step_order === "number" ? maxRow.step_order + 1 : 0;

      const row: TablesInsert<"crm_workflow_steps"> = {
        workflow_id: workflowId,
        step_order: nextOrder,
        action_type: sourceStep.action_type,
        delay_minutes: Math.min(525600, Math.max(0, Math.floor(sourceStep.delay_minutes ?? 0))),
        action_config: sourceStep.action_config ?? {},
        branch_condition: sourceStep.branch_condition ?? {},
        next_step_order_if_true: sourceStep.next_step_order_if_true ?? null,
        next_step_order_if_false: sourceStep.next_step_order_if_false ?? null,
      };
      const { error } = await supabase.from("crm_workflow_steps").insert(row);
      if (error) throw error;
      return { workflowId, nextOrder };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: KEYS });
      void qc.invalidateQueries({ queryKey: [...KEYS, "steps", data.workflowId] });
      void qc.invalidateQueries({ queryKey: [...KEYS, "step-runs", data.workflowId] });
    },
  });
}

export type ContactCrmWorkflowEnrollment = CrmWorkflowEnrollment & {
  workflow_name: string | null;
};

export function useCrmWorkflowEnrollmentsForContact(contactId: string | undefined) {
  return useQuery({
    queryKey: [...KEYS, "enrollments-by-contact", contactId],
    enabled: Boolean(contactId),
    queryFn: async (): Promise<ContactCrmWorkflowEnrollment[]> => {
      const { data: rows, error } = await supabase
        .from("crm_workflow_enrollments")
        .select("*")
        .eq("contact_id", contactId!)
        .order("enrolled_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const enrollments = (rows ?? []) as CrmWorkflowEnrollment[];
      const wfIds = [...new Set(enrollments.map((e) => e.workflow_id))];
      if (wfIds.length === 0) {
        return enrollments.map((e) => ({ ...e, workflow_name: null }));
      }
      const { data: wfs, error: wErr } = await supabase.from("crm_workflows").select("id, name").in("id", wfIds);
      if (wErr) throw wErr;
      const map = new Map((wfs ?? []).map((w) => [w.id, w.name as string]));
      return enrollments.map((e) => ({ ...e, workflow_name: map.get(e.workflow_id) ?? null }));
    },
  });
}

export function useStartCrmWorkflowEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, contactId }: { workflowId: string; contactId: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: first, error: fErr } = await supabase
        .from("crm_workflow_steps")
        .select("delay_minutes")
        .eq("workflow_id", workflowId)
        .order("step_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fErr) throw fErr;

      const firstDelay = typeof first?.delay_minutes === "number" ? first.delay_minutes : 0;

      const { error } = await supabase.from("crm_workflow_enrollments").insert({
        workflow_id: workflowId,
        user_id: user.id,
        contact_id: contactId,
        listing_id: null,
        current_step_order: 0,
        status: "active",
        next_action_at: addMinutesToNow(firstDelay),
        context: {},
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: KEYS });
      void qc.invalidateQueries({ queryKey: [...KEYS, "enrollments", variables.workflowId] });
      void qc.invalidateQueries({ queryKey: [...KEYS, "step-runs", variables.workflowId] });
      void qc.invalidateQueries({ queryKey: [...KEYS, "enrollments-by-contact", variables.contactId] });
      void qc.invalidateQueries({ queryKey: ["contact", variables.contactId] });
    },
  });
}
