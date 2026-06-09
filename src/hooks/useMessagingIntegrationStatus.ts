import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type IntegrationConfiguredStatus = "configured" | "not_configured" | "unavailable";

function getSendEmailUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-email` : null;
}

function getSendSmsUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-sms` : null;
}

async function fetchStatus(url: string): Promise<IntegrationConfiguredStatus> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return "not_configured";

  const res = await fetch(`${url}?action=status`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) return "not_configured";
  if (!res.ok && data?.configured === undefined) return "unavailable";
  if (data?.configured === true) return "configured";
  if (data?.configured === false) return "not_configured";
  return "unavailable";
}

export function useResendIntegrationStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["integration-status", "resend", user?.id],
    queryFn: async (): Promise<IntegrationConfiguredStatus> => {
      const url = getSendEmailUrl();
      if (!url || !user) return "unavailable";
      return fetchStatus(url);
    },
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: false,
  });
}

export function useSmsIntegrationStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["integration-status", "sms", user?.id],
    queryFn: async (): Promise<IntegrationConfiguredStatus> => {
      const url = getSendSmsUrl();
      if (!url || !user) return "unavailable";
      return fetchStatus(url);
    },
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: false,
  });
}
