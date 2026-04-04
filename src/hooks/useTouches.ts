import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DailyTouchSummaryRow = {
  touch_type: string;
  completed: number;
  daily_target: number | null;
};

export function useDailyTouchSummary() {
  return useQuery({
    queryKey: ["daily-touch-summary"],
    queryFn: async (): Promise<DailyTouchSummaryRow[]> => {
      const { data, error } = await (supabase as any).rpc("get_daily_touch_summary");
      if (error) throw error;
      if (!Array.isArray(data)) return [];
      return data.map((row) => ({
        touch_type: String(row.touch_type ?? ""),
        completed: Number(row.completed ?? 0),
        daily_target: row.daily_target == null ? null : Number(row.daily_target),
      }));
    },
    staleTime: 60_000,
  });
}

export type WeeklyTouchSummaryRow = {
  touch_type: string;
  completed: number;
  weekly_target: number | null;
};

export function useWeeklyTouchSummary() {
  return useQuery({
    queryKey: ["weekly-touch-summary"],
    queryFn: async (): Promise<WeeklyTouchSummaryRow[]> => {
      const { data, error } = await (supabase as any).rpc("get_weekly_touch_summary");
      if (error) throw error;
      if (!Array.isArray(data)) return [];
      return data.map((row) => ({
        touch_type: String(row.touch_type ?? ""),
        completed: Number(row.completed ?? 0),
        weekly_target: row.weekly_target == null ? null : Number(row.weekly_target),
      }));
    },
    staleTime: 60_000,
  });
}
