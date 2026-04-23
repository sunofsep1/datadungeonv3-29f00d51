import { useEffect, useRef } from "react";
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
  const queryKeysRef = useRef(queryKeys);

  useEffect(() => {
    queryKeysRef.current = queryKeys;
  });

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
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          queryKeysRef.current.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, queryClient]);
}
