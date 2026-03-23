import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type UserReminderPreferences = Database["public"]["Tables"]["user_reminder_preferences"]["Row"];

const key = ["user_reminder_preferences"] as const;

export function useUserReminderPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...key, user?.id],
    queryFn: async (): Promise<UserReminderPreferences | null> => {
      if (!user) return null;
      const { data, error } = await supabase.from("user_reminder_preferences").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data as UserReminderPreferences | null;
    },
    enabled: Boolean(user),
  });
}

export function useUpsertUserReminderPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { digest_enabled?: boolean; digest_frequency?: "daily" | "weekly" }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("user_reminder_preferences")
        .upsert(
          {
            user_id: user.id,
            digest_enabled: input.digest_enabled ?? true,
            digest_frequency: input.digest_frequency ?? "daily",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as UserReminderPreferences;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
