import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

export type AgentboxSyncResult = {
  ok: boolean;
  action: string;
  configured?: boolean;
  imported?: number;
  updated?: number;
  skipped?: number;
  total?: number;
  message?: string;
  error?: string;
};

async function invokeAgentboxSync(body: { action: string; limit?: number }): Promise<AgentboxSyncResult> {
  const { data, error } = await supabase.functions.invoke("agentbox-sync", { body });
  if (error) throw new Error(supabaseErrorMessage(error));
  return (data ?? { ok: false, action: body.action, error: "Empty response" }) as AgentboxSyncResult;
}

export function useAgentboxSyncStatus() {
  return useMutation({
    mutationFn: () => invokeAgentboxSync({ action: "status" }),
  });
}

export function useAgentboxSyncContacts() {
  return useMutation({
    mutationFn: (limit = 100) => invokeAgentboxSync({ action: "sync_contacts", limit }),
  });
}
