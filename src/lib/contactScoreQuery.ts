import type { QueryClient } from "@tanstack/react-query";

/** React Query prefix for `useContactScore` and batch score hooks. */
export const CONTACT_SCORES_QUERY_ROOT = ["contact_scores"] as const;

/** Same thresholds as `recalculate_contact_score` → lead_temperature mapping. */
export function leadScoreBand(total: number): "hot" | "warm" | "cold" {
  if (total >= 61) return "hot";
  if (total >= 31) return "warm";
  return "cold";
}

/**
 * Invalidate cached lead scores after writes that trigger `recalculate_contact_score`
 * (contacts, touches, interactions, property links, etc.).
 */
export function invalidateContactScoreQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: [...CONTACT_SCORES_QUERY_ROOT] });
  void queryClient.invalidateQueries({ queryKey: ["contacts"] });
  void queryClient.invalidateQueries({ queryKey: ["contact"] });
}
