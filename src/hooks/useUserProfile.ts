import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserProfile = {
  user_id: string;
  display_name: string;
  phone: string;
  agency_name: string;
  license_number: string;
  avatar_url: string | null;
  default_calendar_view: "day" | "week" | "month";
  default_appointment_duration: 30 | 45 | 60 | 90;
  default_follow_up_days: number;
  updated_at: string;
};

export type UserProfileInput = {
  display_name?: string;
  phone?: string;
  agency_name?: string;
  license_number?: string;
  avatar_url?: string | null;
  default_calendar_view?: "day" | "week" | "month";
  default_appointment_duration?: 30 | 45 | 60 | 90;
  default_follow_up_days?: number;
};

const key = ["user_profile"] as const;

function metadataDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string | null }) {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.display_name === "string" && meta.display_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";
  if (fromMeta) return fromMeta;
  const email = user.email ?? "";
  return email.includes("@") ? email.split("@")[0] : "";
}

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...key, user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        if (error.code === "PGRST204" || error.code === "42P01") return null;
        throw error;
      }

      if (data) return data as UserProfile;

      return {
        user_id: user.id,
        display_name: metadataDisplayName(user),
        phone: "",
        agency_name: "",
        license_number: "",
        avatar_url: null,
        default_calendar_view: "week",
        default_appointment_duration: 60,
        default_follow_up_days: 14,
        updated_at: new Date().toISOString(),
      };
    },
    enabled: Boolean(user),
  });
}

export function useUpsertUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UserProfileInput) => {
      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        ...input,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST204" || error.code === "42P01") {
          if (input.display_name !== undefined) {
            const { error: authError } = await supabase.auth.updateUser({
              data: { full_name: input.display_name, display_name: input.display_name },
            });
            if (authError) throw authError;
          }
          return null;
        }
        throw error;
      }

      if (input.display_name !== undefined) {
        await supabase.auth.updateUser({
          data: { full_name: input.display_name, display_name: input.display_name },
        });
      }

      return data as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
