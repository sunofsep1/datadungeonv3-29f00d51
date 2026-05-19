import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EntityAuditRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  summary: string | null;
  changed_at: string;
};

export function useEntityAuditLog(entityType: "contact" | "listing" | "property", entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity_audit_log", entityType, entityId ?? ""],
    queryFn: async () => {
      if (!entityId) return [] as EntityAuditRow[];
      const { data, error } = await supabase
        .from("entity_audit_log")
        .select("id, entity_type, entity_id, field_name, old_value, new_value, summary, changed_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("changed_at", { ascending: false })
        .limit(80);
      if (error) {
        if (error.code === "42P01") return [] as EntityAuditRow[];
        throw error;
      }
      return (data ?? []) as EntityAuditRow[];
    },
    enabled: !!entityId,
  });
}
