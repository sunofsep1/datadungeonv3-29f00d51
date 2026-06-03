import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationDigestResult = {
  stale_contact_notifications: number;
  overdue_task_notifications: number;
  nurture_due_notifications: number;
};

export function useNotificationDigest() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification-digest", user?.id],
    queryFn: async (): Promise<NotificationDigestResult> => {
      const { data, error } = await (supabase as any).rpc("run_notification_digest_for_current_user");
      if (error) throw error;
      const row = (data ?? {}) as Record<string, unknown>;
      return {
        stale_contact_notifications: Number(row.stale_contact_notifications ?? 0),
        overdue_task_notifications: Number(row.overdue_task_notifications ?? 0),
        nurture_due_notifications: Number(row.nurture_due_notifications ?? 0),
      };
    },
    enabled: Boolean(user),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: true,
  });
}
