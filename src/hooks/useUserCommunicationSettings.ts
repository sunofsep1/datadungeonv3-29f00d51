import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type UserCommunicationSettings = Database["public"]["Tables"]["user_communication_settings"]["Row"];

const key = ["user_communication_settings"] as const;

export function useUserCommunicationSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...key, user?.id],
    queryFn: async (): Promise<UserCommunicationSettings | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_communication_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserCommunicationSettings | null;
    },
    enabled: Boolean(user),
  });
}

export function useUpsertUserCommunicationSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      sms_signature?: string;
      email_signature?: string;
      email_from_name?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("user_communication_settings")
        .upsert(
          {
            user_id: user.id,
            ...input,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as UserCommunicationSettings;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
