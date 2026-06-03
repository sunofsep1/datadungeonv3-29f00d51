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

export type TouchActivityRange = "today" | "week";

export type TouchActivityRow = {
  id: string;
  source: "touches" | "interactions";
  touch_type: string;
  contact_id: string | null;
  contact_name: string;
  occurred_at: string;
  notes: string | null;
};

export function useTouchActivityReport(range: TouchActivityRange) {
  return useQuery({
    queryKey: ["touch-activity-report", range],
    queryFn: async (): Promise<TouchActivityRow[]> => {
      const { data, error } = await (supabase as any).rpc("get_touch_activity_report", {
        p_range: range,
      });
      if (error) throw error;
      if (!Array.isArray(data)) return [];
      return data.map((row: Record<string, unknown>) => ({
        id: String(row.event_id ?? row.id ?? crypto.randomUUID()),
        source: row.source === "interactions" ? "interactions" : "touches",
        touch_type: String(row.touch_type ?? "other"),
        contact_id: row.contact_id ? String(row.contact_id) : null,
        contact_name: row.contact_name ? String(row.contact_name) : "Unknown contact",
        occurred_at: String(row.occurred_at ?? new Date().toISOString()),
        notes: row.notes ? String(row.notes) : null,
      }));
    },
    staleTime: 30_000,
  });
}
