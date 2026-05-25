export const OFI_INTEREST_LEVELS = ["hot", "warm", "cold", "not_interested"] as const;
export type OfiInterestLevel = (typeof OFI_INTEREST_LEVELS)[number];

export const OFI_INTEREST_LABELS: Record<OfiInterestLevel, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  not_interested: "Not interested",
};

export function normalizeOfiInterestLevel(raw: string | null | undefined): OfiInterestLevel {
  const v = raw?.trim().toLowerCase();
  if (v === "hot" || v === "warm" || v === "cold" || v === "not_interested") return v;
  return "warm";
}

export function ofiInterestBadgeClass(level: string | null | undefined): string {
  const v = normalizeOfiInterestLevel(level);
  if (v === "hot") return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/35";
  if (v === "cold") return "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/35";
  if (v === "not_interested") return "bg-muted text-muted-foreground border-border";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/35";
}

export function ofiInterestLabel(level: string | null | undefined): string {
  return OFI_INTEREST_LABELS[normalizeOfiInterestLevel(level)];
}
