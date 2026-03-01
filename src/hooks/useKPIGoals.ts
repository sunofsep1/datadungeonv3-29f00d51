import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export type KPIGoals = Tables<"kpi_goals">;
export type KPIGoalsInsert = TablesInsert<"kpi_goals">;
export type KPIGoalsUpdate = TablesUpdate<"kpi_goals">;

const defaultGoals = {
  calls_made_goal: 200,
  appointments_set_goal: 20,
  listings_taken_goal: 5,
  offers_written_goal: 15,
  contracts_signed_goal: 8,
  closings_goal: 4,
  gci_earned_goal: 100000,
};

export function useKPIGoals() {
  // Subscribe to realtime changes
  useRealtimeSubscription("kpi_goals", [["kpi_goals"]]);

  return useQuery({
    queryKey: ["kpi_goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_goals")
        .select("*")
        .maybeSingle();
      if (!error) return data as KPIGoals | null;
      const msg = (error?.message ?? "").toLowerCase();
      if (error?.code === "PGRST204" || msg.includes("relation") || msg.includes("kpi_goals") || msg.includes("does not exist") || String(error?.code) === "400") {
        return null;
      }
      throw error;
    },
  });
}

export function useUpsertKPIGoals() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goals: Partial<Omit<KPIGoals, "id" | "user_id" | "updated_at">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Check if goals exist for user
      const { data: existing, error: fetchError } = await supabase
        .from("kpi_goals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (fetchError) {
        const msg = (fetchError?.message ?? "").toLowerCase();
        if (fetchError.code === "PGRST204" || String(fetchError.code) === "400" || msg.includes("relation") || msg.includes("kpi_goals") || msg.includes("does not exist")) {
          throw new Error("KPI goals table is not set up. Run database migrations (npm run db:push) to enable goals.");
        }
        throw fetchError;
      }
      
      if (existing) {
        const { data, error } = await supabase
          .from("kpi_goals")
          .update(goals)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) {
          const msg = (error?.message ?? "").toLowerCase();
          if (error.code === "PGRST204" || String(error.code) === "400" || msg.includes("relation") || msg.includes("kpi_goals") || msg.includes("does not exist")) {
            throw new Error("KPI goals table is not set up. Run database migrations (npm run db:push) to enable goals.");
          }
          throw error;
        }
        return data;
      } else {
        const { data, error } = await supabase
          .from("kpi_goals")
          .insert({ ...defaultGoals, ...goals, user_id: user.id })
          .select()
          .single();
        if (error) {
          const msg = (error?.message ?? "").toLowerCase();
          if (error.code === "PGRST204" || String(error.code) === "400" || msg.includes("relation") || msg.includes("kpi_goals") || msg.includes("does not exist")) {
            throw new Error("KPI goals table is not set up. Run database migrations (npm run db:push) to enable goals.");
          }
          throw error;
        }
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi_goals"] });
    },
  });
}
