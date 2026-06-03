import type { QueryClient } from "@tanstack/react-query";

export const CONTACT_SCORES_QUERY_ROOT = ["contact_scores"] as const;

/** Score thresholds — must match recalculate_contact_score DB function. */
export function leadScoreBand(total: number): "hot" | "warm" | "cold" {
  if (total >= 61) return "hot";
  if (total >= 31) return "warm";
  return "cold";
}

export type TempBand = "hot" | "warm" | "cold" | "archived";

/**
 * Returns CSS-variable-based colors for temperature badges and score text.
 * Values come from `src/index.css` temperature token definitions.
 */
export function bandColors(band: TempBand): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  solidText: string;
  label: string;
  bandLabel: string;
} {
  const map: Record<
    TempBand,
    {
      badgeBg: string;
      badgeText: string;
      badgeBorder: string;
      solidText: string;
      label: string;
      bandLabel: string;
    }
  > = {
    hot: {
      badgeBg: "var(--temp-hot-bg)",
      badgeText: "var(--temp-hot-text)",
      badgeBorder: "var(--temp-hot-border)",
      solidText: "var(--temp-hot-solid)",
      label: "Hot",
      bandLabel: "Hot band",
    },
    warm: {
      badgeBg: "var(--temp-warm-bg)",
      badgeText: "var(--temp-warm-text)",
      badgeBorder: "var(--temp-warm-border)",
      solidText: "var(--temp-warm-solid)",
      label: "Warm",
      bandLabel: "Warm band",
    },
    cold: {
      badgeBg: "var(--temp-cold-bg)",
      badgeText: "var(--temp-cold-text)",
      badgeBorder: "var(--temp-cold-border)",
      solidText: "var(--temp-cold-solid)",
      label: "Cold",
      bandLabel: "Cold band",
    },
    archived: {
      badgeBg: "var(--temp-archived-bg)",
      badgeText: "var(--temp-archived-text)",
      badgeBorder: "var(--temp-archived-border)",
      solidText: "var(--temp-archived-solid)",
      label: "Archived",
      bandLabel: "Archived",
    },
  };
  return map[band];
}

export function invalidateContactScoreQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: [...CONTACT_SCORES_QUERY_ROOT] });
  void queryClient.invalidateQueries({ queryKey: ["contacts"] });
  void queryClient.invalidateQueries({ queryKey: ["contact"] });
}
