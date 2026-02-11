import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export type Activity = Tables<"activities">;
export type ActivityInsert = TablesInsert<"activities">;

export function useActivities() {
  // Subscribe to realtime changes for all activity-related queries
  useRealtimeSubscription("activities", [
    ["activities"],
    ["activities", "current-month"],
    ["activities", "weekly"],
    ["activities", "today"],
  ]);

  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("date", { ascending: false });
      if (!error) return (data ?? []) as Activity[];
      // Table may not exist yet (migrations not run); return empty so UI doesn't break
      const msg = (error?.message ?? "").toLowerCase();
      if (error?.code === "PGRST204" || msg.includes("relation") || msg.includes("activities") || msg.includes("does not exist") || String(error?.code) === "400") {
        return [] as Activity[];
      }
      throw error;
    },
  });
}

export function useCurrentMonthActivities() {
  return useQuery({
    queryKey: ["activities", "current-month"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)
        .order("date", { ascending: false });
      if (!error) return (data ?? []) as Activity[];
      const msg = (error?.message ?? "").toLowerCase();
      if (error?.code === "PGRST204" || msg.includes("relation") || msg.includes("activities") || msg.includes("does not exist") || String(error?.code) === "400") {
        return [] as Activity[];
      }
      throw error;
    },
  });
}

export function useWeeklyActivities() {
  return useQuery({
    queryKey: ["activities", "weekly"],
    queryFn: async () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startDate = startOfWeek.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .gte("date", startDate)
        .order("date", { ascending: true });
      if (!error) return (data ?? []) as Activity[];
      const msg = (error?.message ?? "").toLowerCase();
      if (error?.code === "PGRST204" || msg.includes("relation") || msg.includes("activities") || msg.includes("does not exist") || String(error?.code) === "400") {
        return [] as Activity[];
      }
      throw error;
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (activity: Omit<ActivityInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("activities")
        .insert({ ...activity, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useTodayActivity() {
  return useQuery({
    queryKey: ["activities", "today"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("date", today)
        .maybeSingle();
      if (!error) return data as Activity | null;
      const msg = (error?.message ?? "").toLowerCase();
      if (error?.code === "PGRST204" || msg.includes("relation") || msg.includes("activities") || msg.includes("does not exist") || String(error?.code) === "400") {
        return null;
      }
      throw error;
    },
  });
}

export function useUpsertTodayActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (activity: Partial<Omit<Activity, "id" | "user_id" | "created_at">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const today = new Date().toISOString().split('T')[0];
      
      // Check if today's activity exists
      const { data: existing } = await supabase
        .from("activities")
        .select("id")
        .eq("date", today)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from("activities")
          .update(activity)
          .eq("id", existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("activities")
          .insert({ ...activity, user_id: user.id, date: today })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}
