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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS });
    },
  });
}
