import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DataHealthResult = {
  health_score: number;
  total_contacts: number;
  contacts_missing_category: number;
  contacts_missing_touch_date: number;
  total_properties: number;
  properties_missing_details: number;
  /** Documents how the score denominator is built (matches playbook: contacts×2 + properties×4). */
  checks_mode?: string;
};

export function useDataHealth() {
  return useQuery({
    queryKey: ["data-health"],
    queryFn: async (): Promise<DataHealthResult> => {
      const { data, error } = await (supabase as any).rpc("get_data_health");
      if (error) throw error;
      const fallback: DataHealthResult = {
        health_score: 0,
        total_contacts: 0,
        contacts_missing_category: 0,
        contacts_missing_touch_date: 0,
        total_properties: 0,
        properties_missing_details: 0,
      };
      if (!data || typeof data !== "object") return fallback;
      const row = data as Record<string, unknown>;
      return {
        health_score: Number(row.health_score ?? 0),
        total_contacts: Number(row.total_contacts ?? 0),
        contacts_missing_category: Number(row.contacts_missing_category ?? 0),
        contacts_missing_touch_date: Number(row.contacts_missing_touch_date ?? 0),
        total_properties: Number(row.total_properties ?? 0),
        properties_missing_details: Number(row.properties_missing_details ?? 0),
        checks_mode: typeof row.checks_mode === "string" ? row.checks_mode : undefined,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
