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

function newChannelInstanceId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

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
    /** New id every subscribe: Supabase dedupes `channel(name)`; reuse after StrictMode cleanup can return an already-subscribed channel and `.on()` throws. */
    const instanceId = newChannelInstanceId();
    const channel = supabase
      .channel(`realtime-${tableName}-${instanceId}`)
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
      void supabase.removeChannel(channel);
    };
     
  }, [tableName, queryClient]);
}
