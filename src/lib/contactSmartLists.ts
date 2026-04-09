export type ContactClassificationKey =
  | "top_100"
  | "past_client"
  | "referral_partner"
  | "hot_lead"
  | "warm_lead"
  | "seller_nurture";

export type ContactSmartListId =
  | "all"
  | ContactClassificationKey
  | "stale"
  | "no_next_touch"
  | "automation_blocked";

export const CONTACT_SMART_LISTS: Array<{
  id: ContactSmartListId;
  label: string;
  short?: string;
}> = [
  { id: "all", label: "All contacts", short: "All" },
  { id: "top_100", label: "Top 100", short: "Top 100" },
  { id: "past_client", label: "Past clients", short: "Past" },
  { id: "referral_partner", label: "Referral partners", short: "Partners" },
  { id: "hot_lead", label: "Hot leads", short: "Hot" },
  { id: "warm_lead", label: "Warm leads", short: "Warm" },
  { id: "seller_nurture", label: "Seller nurture", short: "Seller" },
  { id: "stale", label: "Stale (30+ days no touch)", short: "Stale" },
  { id: "no_next_touch", label: "No next touch date", short: "No next touch" },
  {
    id: "automation_blocked",
    label: "Unreachable for automation (no email & no SMS number)",
    short: "Auto block",
  },
];

const CLASSIFICATION_SET = new Set<ContactClassificationKey>([
  "top_100",
  "past_client",
  "referral_partner",
  "hot_lead",
  "warm_lead",
  "seller_nurture",
]);

export function parseSmartListParam(raw: string | null): ContactSmartListId | null {
  if (raw === "all") return "all";
  if (!raw) return null;
  if (raw === "stale" || raw === "no_next_touch" || raw === "automation_blocked") return raw;
  if (CLASSIFICATION_SET.has(raw as ContactClassificationKey)) return raw as ContactClassificationKey;
  return null;
}

export function isClassificationSmartList(id: ContactSmartListId): id is ContactClassificationKey {
  return id !== "all" && id !== "stale" && id !== "no_next_touch" && id !== "automation_blocked";
}
