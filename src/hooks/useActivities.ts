import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export type Activity = Tables<"activities">;
export type ActivityInsert = TablesInsert<"activities">;

const ACTIVITIES_DATE_COLUMNS = ["activity_date", "date", "created_at"] as const;

function isColumnMissingError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const msg = String(error.message ?? "").toLowerCase();
  return code === "PGRST204" || code === "42703" || msg.includes("could not find the") || msg.includes("schema cache");
}

async function selectActivitiesOrdered(
  where?: (q: ReturnType<typeof supabase.from>) => any,
  ascending = false,
): Promise<Activity[]> {
  let lastError: any = null;
  for (const col of ACTIVITIES_DATE_COLUMNS) {
    const base = supabase.from("activities").select("*");
    const q = where ? where(base) : base;
    const res = await q.order(col as any, { ascending });
    if (!res.error) return (res.data ?? []) as Activity[];
    lastError = res.error;
    if (!isColumnMissingError(res.error)) break;
  }
  if (lastError) {
    const msg = String(lastError.message ?? "").toLowerCase();
    if (isColumnMissingError(lastError) || msg.includes("relation") || msg.includes("does not exist")) return [];
    throw lastError;
  }
  return [];
}

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
      return await selectActivitiesOrdered(undefined, false);
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
      return await selectActivitiesOrdered(
        (q: any) => q.gte("activity_date", startOfMonth).lte("activity_date", endOfMonth),
        false,
      ).catch(async (e) => {
        // If activity_date doesn't exist, try the other columns with the same range.
        if (!isColumnMissingError(e)) throw e;
        for (const col of ["date", "created_at"] as const) {
          const res = await supabase.from("activities").select("*").gte(col as any, startOfMonth).lte(col as any, endOfMonth).order(col as any, { ascending: false });
          if (!res.error) return (res.data ?? []) as Activity[];
          if (!isColumnMissingError(res.error)) break;
        }
        return [] as Activity[];
      });
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
      // Prefer activity_date, fallback to other cols
      for (const col of ACTIVITIES_DATE_COLUMNS) {
        const res = await supabase.from("activities").select("*").gte(col as any, startDate).order(col as any, { ascending: true });
        if (!res.error) return (res.data ?? []) as Activity[];
        if (!isColumnMissingError(res.error)) break;
      }
      return [] as Activity[];
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
      for (const col of ACTIVITIES_DATE_COLUMNS) {
        const res = await supabase.from("activities").select("*").eq(col as any, today).maybeSingle();
        if (!res.error) return res.data as Activity | null;
        if (!isColumnMissingError(res.error)) break;
      }
      return null;
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
