import type { ScriptRecord } from "@/hooks/useScripts";

/** Category order: lower index = more relevant for this contact playbook. */
export function scriptCategoryPriority(contactCategory: string | null | undefined): string[] {
  const c = String(contactCategory ?? "")
    .toLowerCase()
    .trim();
  if (c === "past_client") return ["annual_review", "follow_up", "text_template", "listing_presentation", "other"];
  if (c === "hot_lead" || c === "warm_lead") {
    return ["follow_up", "cold_call", "objection_handling", "text_template", "listing_presentation", "other"];
  }
  if (c === "referral_partner") return ["follow_up", "annual_review", "text_template", "other"];
  if (c === "seller_nurture") {
    return ["listing_presentation", "follow_up", "objection_handling", "price_reduction", "other"];
  }
  if (c === "top_100") return ["follow_up", "annual_review", "listing_presentation", "text_template", "other"];
  return ["follow_up", "text_template", "objection_handling", "cold_call", "other"];
}

function categoryRank(cat: string | null | undefined, order: string[]): number {
  const c = String(cat ?? "other").toLowerCase();
  const i = order.indexOf(c);
  return i === -1 ? order.length + 1 : i;
}

/** Stable sort: playbook match first, then title. */
export function rankScriptsForContact(
  scripts: ScriptRecord[],
  contactCategory: string | null | undefined,
): ScriptRecord[] {
  const order = scriptCategoryPriority(contactCategory);
  return [...scripts].sort((a, b) => {
    const ra = categoryRank(a.category, order);
    const rb = categoryRank(b.category, order);
    if (ra !== rb) return ra - rb;
    return (a.title ?? "").localeCompare(b.title ?? "", undefined, { sensitivity: "base" });
  });
}
