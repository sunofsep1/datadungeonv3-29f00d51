import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

const notificationsKey = ["notifications"] as const;

export function useNotifications(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...notificationsKey, user?.id, limit],
    queryFn: async (): Promise<AppNotification[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications" as never)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    enabled: Boolean(user),
  });
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...notificationsKey, "unread_count", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("notifications" as never)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(user),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications" as never)
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notifications" as never)
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}
