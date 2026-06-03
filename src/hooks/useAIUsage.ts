import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { summarizeUsageRows } from "@/lib/aiUsageSummary";

export type AIUsageDailyRow = {
  id: string;
  user_id: string | null;
  usage_date: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost_usd: number;
  updated_at: string;
};

const AI_USAGE_KEYS = ["ai-usage"] as const;

export function useAIUsageDaily(days = 30) {
  const { user } = useAuth();
  const since = useMemo(() => format(subDays(new Date(), Math.max(1, days) - 1), "yyyy-MM-dd"), [days]);
  return useQuery({
    queryKey: [...AI_USAGE_KEYS, "daily", user?.id, days, since],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<AIUsageDailyRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("ai_usage_daily")
        .select("*")
        .eq("user_id", user.id)
        .gte("usage_date", since)
        .order("usage_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AIUsageDailyRow[];
    },
  });
}

export function useAIUsageSummary(days = 30) {
  const { data: rows = [], isLoading, isError, refetch } = useAIUsageDaily(days);
  const summary = useMemo(() => summarizeUsageRows(rows), [rows]);

  return { rows, summary, isLoading, isError, refetch };
}
