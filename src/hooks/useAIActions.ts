import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateContactTask } from "@/hooks/useContactTasks";
import { useUpdateContact } from "@/hooks/useContacts";
import { useCreateInteraction } from "@/hooks/useInteractions";
import { useStartCrmWorkflowEnrollment } from "@/hooks/useCrmWorkflows";

export type AIOpsActionStatus =
  | "pending"
  | "confirmed"
  | "executing"
  | "succeeded"
  | "failed"
  | "cancelled";

export type AIOpsActionRun = {
  id: string;
  user_id: string;
  prompt: string;
  status: AIOpsActionStatus;
  estimated_cost_usd: number;
  actual_cost_usd: number;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
};

export type AIOpsActionItem = {
  id: string;
  run_id: string;
  user_id: string;
  action_type: "create_task" | "update_contact" | "log_touch" | "enroll_workflow";
  target_type: string;
  target_id: string | null;
  payload_preview: Record<string, unknown>;
  payload_execute: Record<string, unknown>;
  status: AIOpsActionStatus;
  execution_result: Record<string, unknown> | null;
  error_message: string | null;
  sort_order: number;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
};

const AI_ACTION_KEYS = ["ai-actions"] as const;

type CreateDraftPayload = {
  prompt: string;
  items: Array<{
    action_type: AIOpsActionItem["action_type"];
    target_type?: string;
    target_id?: string | null;
    payload_preview: Record<string, unknown>;
    payload_execute: Record<string, unknown>;
  }>;
  estimated_cost_usd?: number;
};

export function useAIOpsRuns(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...AI_ACTION_KEYS, "runs", user?.id, limit],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<AIOpsActionRun[]> => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("ai_action_runs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AIOpsActionRun[];
    },
  });
}

export function useAIOpsItems(runId?: string | null) {
  return useQuery({
    queryKey: [...AI_ACTION_KEYS, "items", runId ?? "none"],
    enabled: Boolean(runId),
    queryFn: async (): Promise<AIOpsActionItem[]> => {
      if (!runId) return [];
      const { data, error } = await (supabase as any)
        .from("ai_action_items")
        .select("*")
        .eq("run_id", runId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AIOpsActionItem[];
    },
  });
}

export function useAIOpsPendingItemsCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...AI_ACTION_KEYS, "pending-count", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;
      const { data, error } = await (supabase as any)
        .from("ai_action_items")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["pending", "confirmed", "executing"]);
      if (error) throw error;
      return (data ?? []).length;
    },
  });
}

export function useCreateAIOpsDraftRun() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: CreateDraftPayload): Promise<{ runId: string }> => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!payload.items.length) throw new Error("No draft actions to save");

      const { data: run, error: runErr } = await (supabase as any)
        .from("ai_action_runs")
        .insert({
          user_id: user.id,
          prompt: payload.prompt.trim() || "AI Ops draft run",
          status: "pending",
          estimated_cost_usd: payload.estimated_cost_usd ?? 0,
        })
        .select("id")
        .single();
      if (runErr) throw runErr;
      if (!run?.id) throw new Error("Could not create AI run");

      const items = payload.items.map((item, i) => ({
        run_id: run.id,
        user_id: user.id,
        action_type: item.action_type,
        target_type: item.target_type ?? "contact",
        target_id: item.target_id ?? null,
        payload_preview: item.payload_preview ?? {},
        payload_execute: item.payload_execute ?? {},
        status: "pending",
        sort_order: i,
      }));

      const { error: itemErr } = await (supabase as any).from("ai_action_items").insert(items);
      if (itemErr) throw itemErr;
      return { runId: run.id as string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: AI_ACTION_KEYS });
    },
  });
}

export function useSetAIOpsItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      status,
      errorMessage,
      executionResult,
    }: {
      itemId: string;
      status: AIOpsActionStatus;
      errorMessage?: string | null;
      executionResult?: Record<string, unknown> | null;
    }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
      if (["succeeded", "failed", "cancelled"].includes(status)) patch.completed_at = new Date().toISOString();
      if (typeof errorMessage !== "undefined") patch.error_message = errorMessage;
      if (typeof executionResult !== "undefined") patch.execution_result = executionResult;

      const { error } = await (supabase as any).from("ai_action_items").update(patch).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: AI_ACTION_KEYS });
    },
  });
}

export function useSetAIOpsRunStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      runId,
      status,
      actualCostUsd,
    }: {
      runId: string;
      status: AIOpsActionStatus;
      actualCostUsd?: number;
    }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
      if (["succeeded", "failed", "cancelled"].includes(status)) patch.completed_at = new Date().toISOString();
      if (typeof actualCostUsd === "number") patch.actual_cost_usd = actualCostUsd;
      const { error } = await (supabase as any).from("ai_action_runs").update(patch).eq("id", runId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: AI_ACTION_KEYS });
    },
  });
}

export function useConfirmAndExecuteAIOpsRun(runId: string | null | undefined) {
  const { data: items = [] } = useAIOpsItems(runId);
  const setItemStatus = useSetAIOpsItemStatus();
  const setRunStatus = useSetAIOpsRunStatus();

  const createTask = useCreateContactTask();
  const updateContact = useUpdateContact();
  const createInteraction = useCreateInteraction();
  const enrollWorkflow = useStartCrmWorkflowEnrollment();

  const canExecute = useMemo(
    () => Boolean(runId) && items.some((i) => i.status === "confirmed" || i.status === "pending"),
    [runId, items],
  );

  const execute = async () => {
    if (!runId) throw new Error("Missing run id");
    await setRunStatus.mutateAsync({ runId, status: "executing" });
    const ordered = [...items].sort((a, b) => a.sort_order - b.sort_order);
    let failed = 0;
    for (const item of ordered) {
      if (item.status === "cancelled" || item.status === "succeeded") continue;
      await setItemStatus.mutateAsync({ itemId: item.id, status: "executing", errorMessage: null });
      try {
        const payload = item.payload_execute ?? {};
        if (item.action_type === "create_task") {
          await createTask.mutateAsync({
            contact_id: String(payload.contact_id),
            title: String(payload.title ?? "Follow up"),
            notes: payload.notes ? String(payload.notes) : null,
            due_at: payload.due_at ? String(payload.due_at) : null,
          });
        } else if (item.action_type === "update_contact") {
          const contactId = String(payload.contact_id ?? item.target_id ?? "");
          if (!contactId) throw new Error("update_contact requires contact_id");
          await updateContact.mutateAsync({
            id: contactId,
            ...(payload.updates && typeof payload.updates === "object"
              ? (payload.updates as Record<string, unknown>)
              : {}),
            skipActivityLog: true,
          } as any);
        } else if (item.action_type === "log_touch") {
          await createInteraction.mutateAsync({
            contact_id: String(payload.contact_id),
            type: String(payload.type ?? "note"),
            subject: payload.subject ? String(payload.subject) : null,
            body: payload.body ? String(payload.body) : null,
            channel: payload.channel ? String(payload.channel) : null,
            timestamp: payload.timestamp ? String(payload.timestamp) : new Date().toISOString(),
          } as any);
        } else if (item.action_type === "enroll_workflow") {
          await enrollWorkflow.mutateAsync({
            workflowId: String(payload.workflow_id),
            contactId: String(payload.contact_id),
          });
        } else {
          throw new Error(`Unknown action_type: ${item.action_type}`);
        }
        await setItemStatus.mutateAsync({
          itemId: item.id,
          status: "succeeded",
          executionResult: { ok: true, at: new Date().toISOString() },
        });
      } catch (error) {
        failed += 1;
        await setItemStatus.mutateAsync({
          itemId: item.id,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Execution failed",
        });
      }
    }
    await setRunStatus.mutateAsync({ runId, status: failed > 0 ? "failed" : "succeeded" });
  };

  return { canExecute, execute, items };
}
