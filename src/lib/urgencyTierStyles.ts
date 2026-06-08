import type { ContactUrgencyTier } from "@/lib/contactUrgency";

/** Lower rank = more urgent (matches sort order: immediate first). */
export const URGENCY_TIER_RANK: Record<ContactUrgencyTier, number> = {
  immediate: 0,
  priority: 1,
  planned: 2,
  backlog: 3,
};

/** Soft badge chip (Daily Hub, filters) — aligns hue-wise with Contacts list category dots. */
export function urgencyTierBadgeClass(tier: ContactUrgencyTier): string {
  switch (tier) {
    case "immediate":
      return "bg-orange-600/35 text-orange-50 border-orange-500/55";
    case "priority":
      return "bg-amber-500/15 text-amber-200 border-amber-400/35";
    case "planned":
      return "bg-sky-500/15 text-sky-200 border-sky-400/35";
    default:
      return "bg-emerald-500/15 text-emerald-200 border-emerald-400/35";
  }
}

/** Focus / spotlight card chrome on Daily Hub — flat tints so contact names stay readable. */
export function urgencyTierSpotlightCardClass(tier: ContactUrgencyTier): string {
  switch (tier) {
    case "immediate":
      return "border-orange-500/55 bg-orange-950/35";
    case "priority":
      return "border-amber-400/50 bg-amber-950/28";
    case "planned":
      return "border-sky-400/50 bg-sky-950/28";
    default:
      return "border-emerald-400/45 bg-emerald-950/25";
  }
}

export function urgencyTierSpotlightRailClass(tier: ContactUrgencyTier): string {
  switch (tier) {
    case "immediate":
      return "bg-orange-500";
    case "priority":
      return "bg-amber-400";
    case "planned":
      return "bg-sky-400";
    default:
      return "bg-emerald-400";
  }
}

/** Solid dot treatment — matches `CONTACT_CATEGORIES` on Contacts list. */
export function urgencyTierSolidDotClasses(tier: ContactUrgencyTier): { bg: string; border: string } {
  switch (tier) {
    case "immediate":
      return { bg: "bg-orange-500", border: "border-orange-500" };
    case "priority":
      return { bg: "bg-amber-500", border: "border-amber-500" };
    case "planned":
      return { bg: "bg-sky-500", border: "border-sky-500" };
    default:
      return { bg: "bg-emerald-500", border: "border-emerald-500" };
  }
}

export function urgencyTierLabel(tier: ContactUrgencyTier): string {
  switch (tier) {
    case "immediate":
      return "Immediate";
    case "priority":
      return "Priority";
    case "planned":
      return "Planned";
    default:
      return "Backlog";
  }
}

/** High-contrast contact name on Daily Hub cards (matches tier hue). */
export function urgencyTierContactNameClass(tier: ContactUrgencyTier): string {
  switch (tier) {
    case "immediate":
      return "text-orange-100";
    case "priority":
      return "text-amber-50";
    case "planned":
      return "text-sky-100";
    default:
      return "text-emerald-100";
  }
}

type RankableAttention = {
  urgency: ContactUrgencyTier;
  score: number;
  dueAt: Date | null;
};

/** Sort: tier (immediate → backlog), then score desc, then earlier due date first. */
export function compareAttentionItemsByTierScoreDue<T extends RankableAttention>(a: T, b: T): number {
  const ra = URGENCY_TIER_RANK[a.urgency];
  const rb = URGENCY_TIER_RANK[b.urgency];
  if (ra !== rb) return ra - rb;
  if (b.score !== a.score) return b.score - a.score;
  const at = a.dueAt ? a.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
  const bt = b.dueAt ? b.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
  return at - bt;
}
