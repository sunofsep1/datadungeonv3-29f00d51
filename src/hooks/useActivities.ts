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
      const dateCol = "date";
      let { data, error } = await supabase
        .from("activities")
        .select("*")
        .order(dateCol, { ascending: false });
      if (error && String(error?.code) === "400") {
        const altCol = dateCol === "date" ? "activity_date" : "date";
        const retry = await supabase.from("activities").select("*").order(altCol, { ascending: false });
        if (!retry.error) return (retry.data ?? []) as Activity[];
        error = retry.error;
      }
      if (!error) return (data ?? []) as Activity[];
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
      const dateCol = "date";
      let { data, error } = await supabase
        .from("activities")
        .select("*")
        .gte(dateCol, startOfMonth)
        .lte(dateCol, endOfMonth)
        .order(dateCol, { ascending: false });
      if (error && String(error?.code) === "400") {
        const altCol = dateCol === "date" ? "activity_date" : "date";
        const retry = await supabase.from("activities").select("*").gte(altCol, startOfMonth).lte(altCol, endOfMonth).order(altCol, { ascending: false });
        if (!retry.error) return (retry.data ?? []) as Activity[];
        error = retry.error;
      }
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
      const dateCol = "date";
      let { data, error } = await supabase
        .from("activities")
        .select("*")
        .gte(dateCol, startDate)
        .order(dateCol, { ascending: true });
      if (error && String(error?.code) === "400") {
        const altCol = dateCol === "date" ? "activity_date" : "date";
        const retry = await supabase.from("activities").select("*").gte(altCol, startDate).order(altCol, { ascending: true });
        if (!retry.error) return (retry.data ?? []) as Activity[];
        error = retry.error;
      }
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
      
      if (error) {
        const msg = (error?.message ?? "").toLowerCase();
        if (error.code === "PGRST204" || String(error.code) === "400" || msg.includes("relation") || msg.includes("activities") || msg.includes("does not exist")) {
          throw new Error("Activities table is not set up. Run database migrations (npm run db:push) to enable activity tracking.");
        }
        throw error;
      }
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
      const dateCol = "date";
      let { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq(dateCol, today)
        .maybeSingle();
      if (error && String(error?.code) === "400") {
        const retry = await supabase.from("activities").select("*").eq("activity_date", today).maybeSingle();
        if (!retry.error) return retry.data as Activity | null;
        error = retry.error;
      }
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
        
        if (error) {
          const msg = (error?.message ?? "").toLowerCase();
          if (error.code === "PGRST204" || String(error.code) === "400" || msg.includes("relation") || msg.includes("activities") || msg.includes("does not exist")) {
            throw new Error("Activities table is not set up. Run database migrations (npm run db:push) to enable activity tracking.");
          }
          throw error;
        }
        return data;
      } else {
        const { data, error } = await supabase
          .from("activities")
          .insert({ ...activity, user_id: user.id, date: today })
          .select()
          .single();
        
        if (error) {
          const msg = (error?.message ?? "").toLowerCase();
          if (error.code === "PGRST204" || String(error.code) === "400" || msg.includes("relation") || msg.includes("activities") || msg.includes("does not exist")) {
            throw new Error("Activities table is not set up. Run database migrations (npm run db:push) to enable activity tracking.");
          }
          throw error;
        }
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}
