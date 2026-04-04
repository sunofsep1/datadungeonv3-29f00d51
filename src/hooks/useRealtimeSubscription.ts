import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type TableName =
  | "contacts"
  | "listings"
  | "appointments"
  | "activities"
  | "activity_log"
  | "kpi_goals"
  | "tags"
  | "contact_tags"
  | "contact_channels"
  | "properties"
  | "contact_property_links"
  | "notifications";

export function useRealtimeSubscription(
  tableName: TableName,
  queryKeys: string[][]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${tableName}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Invalidate all related queries on realtime changes
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, queryClient, queryKeys]);
}
