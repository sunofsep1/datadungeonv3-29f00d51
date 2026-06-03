import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CONTACT_SCORES_QUERY_ROOT } from "@/lib/contactScoreQuery";
import type { Tables } from "@/integrations/supabase/types";

export type ContactScoreRow = Tables<"contact_scores">;

export { CONTACT_SCORES_QUERY_ROOT, invalidateContactScoreQueries } from "@/lib/contactScoreQuery";

export function useContactScore(contactId: string | undefined | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...CONTACT_SCORES_QUERY_ROOT, contactId],
    queryFn: async (): Promise<ContactScoreRow | null> => {
      if (!user || !contactId) return null;
      const { data, error } = await supabase
        .from("contact_scores")
        .select("*")
        .eq("contact_id", contactId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ContactScoreRow | null;
    },
    enabled: Boolean(user && contactId),
  });
}

/** Batch fetch total_score for list UIs (e.g. Hot Leads). */
export function useContactScoresByContactIds(contactIds: string[]) {
  const { user } = useAuth();
  const sortedKey = useMemo(() => [...new Set(contactIds)].filter(Boolean).sort().join(","), [contactIds]);

  return useQuery({
    queryKey: [...CONTACT_SCORES_QUERY_ROOT, "batch", sortedKey],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!user || !sortedKey) return new Map();
      const ids = sortedKey.split(",").filter(Boolean);
      if (ids.length === 0) return new Map();
      const { data, error } = await supabase
        .from("contact_scores")
        .select("contact_id, total_score")
        .in("contact_id", ids);
      if (error) throw error;
      const m = new Map<string, number>();
      for (const row of (data ?? []) as { contact_id: string; total_score: number }[]) {
        m.set(row.contact_id, row.total_score);
      }
      return m;
    },
    enabled: Boolean(user && sortedKey),
  });
}
