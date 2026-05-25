import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

export type ReapitSyncResult = {
  ok: boolean;
  action: string;
  configured?: boolean;
  customerId?: string | null;
  imported?: number;
  updated?: number;
  skipped?: number;
  total?: number;
  message?: string;
  error?: string;
};

async function invokeReapitSync(body: { action: string; pageSize?: number }): Promise<ReapitSyncResult> {
  const { data, error } = await supabase.functions.invoke("reapit-sync", { body });
  if (error) throw new Error(supabaseErrorMessage(error));
  return (data ?? { ok: false, action: body.action, error: "Empty response" }) as ReapitSyncResult;
}

export function useReapitSyncStatus() {
  return useMutation({
    mutationFn: () => invokeReapitSync({ action: "status" }),
  });
}

export function useReapitSyncContacts() {
  return useMutation({
    mutationFn: (pageSize = 100) => invokeReapitSync({ action: "sync_contacts", pageSize }),
  });
}

export function useReapitSyncListings() {
  return useMutation({
    mutationFn: (pageSize = 100) => invokeReapitSync({ action: "sync_properties", pageSize }),
  });
}
