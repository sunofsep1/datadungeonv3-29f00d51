import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function getGcalUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/google-calendar` : null;
}

export type GoogleCalendarConnectionStatus = "connected" | "not_connected" | "unavailable";

export function useGoogleCalendarConnection() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["google-calendar-connection", user?.id],
    queryFn: async (): Promise<GoogleCalendarConnectionStatus> => {
      const gcalUrl = getGcalUrl();
      if (!gcalUrl || !user) return "unavailable";

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return "not_connected";

      const res = await fetch(`${gcalUrl}?action=events`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.needsAuth || data?.error === "Not connected") {
        return "not_connected";
      }
      return "connected";
    },
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: false,
  });
}
