import { differenceInCalendarDays, format, formatDistanceToNow, parseISO } from "date-fns";
import { listingKanbanColumnId, type ListingKanbanColumnId } from "@/lib/listingKanbanStages";

export type PrimaryCampaignStageKey =
  | "appraisal"
  | "pre_market"
  | "active"
  | "under_offer"
  | "exchanged"
  | "sold"
  | "withdrawn";

export type PrimaryCampaignStage = {
  key: PrimaryCampaignStageKey;
  label: string;
  /** Tailwind classes for badge background/border (dark theme) */
  badgeClass: string;
};

/** Transparent sticky-header glow — one hue per primary campaign stage. */
export function listingStageBannerClass(key: PrimaryCampaignStageKey): string {
  const base =
    "border bg-background/72 backdrop-blur-md shadow-sm";
  switch (key) {
    case "sold":
      return `${base} border-emerald-500/40 bg-emerald-500/[0.06] shadow-[inset_0_0_72px_-24px_rgba(16,185,129,0.28),0_0_48px_-16px_rgba(16,185,129,0.22)]`;
    case "exchanged":
      return `${base} border-violet-500/35 bg-violet-500/[0.05] shadow-[inset_0_0_72px_-24px_rgba(139,92,246,0.22),0_0_48px_-16px_rgba(139,92,246,0.18)]`;
    case "under_offer":
      return `${base} border-amber-500/35 bg-amber-500/[0.05] shadow-[inset_0_0_72px_-24px_rgba(245,158,11,0.22),0_0_48px_-16px_rgba(245,158,11,0.18)]`;
    case "active":
      return `${base} border-emerald-400/30 bg-emerald-400/[0.04] shadow-[inset_0_0_72px_-24px_rgba(52,211,153,0.18),0_0_48px_-16px_rgba(52,211,153,0.14)]`;
    case "pre_market":
      return `${base} border-indigo-500/35 bg-indigo-500/[0.05] shadow-[inset_0_0_72px_-24px_rgba(99,102,241,0.22),0_0_48px_-16px_rgba(99,102,241,0.16)]`;
    case "withdrawn":
      return `${base} border-zinc-500/30 bg-zinc-500/[0.04] shadow-[inset_0_0_48px_-24px_rgba(113,113,122,0.12)]`;
    default:
      return `${base} border-slate-500/30 bg-slate-500/[0.04] shadow-[inset_0_0_48px_-24px_rgba(100,116,139,0.12)]`;
  }
}

const STAGE_STYLES: Record<PrimaryCampaignStageKey, string> = {
  appraisal: "bg-slate-700/90 text-slate-100 border-slate-500/50",
  pre_market: "bg-indigo-900/80 text-indigo-100 border-indigo-500/40",
  active: "bg-emerald-900/70 text-emerald-100 border-emerald-500/40",
  under_offer: "bg-amber-900/70 text-amber-100 border-amber-500/40",
  exchanged: "bg-violet-900/70 text-violet-100 border-violet-500/40",
  sold: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/45",
  withdrawn: "bg-zinc-800 text-zinc-300 border-zinc-600/50",
};

function journeyHintPreMarket(journeyStage: string | null | undefined): boolean {
  const j = (journeyStage || "").toLowerCase();
  return j.includes("pre") || j.includes("prep") || j.includes("coming");
}

/**
 * Single primary campaign stage for UI (spec: one dominant badge).
 */
export function getPrimaryCampaignStage(listing: {
  status: string | null;
  pipeline_stage: string | null;
  journey_stage?: string | null;
}): PrimaryCampaignStage {
  const status = (listing.status || "").toLowerCase();
  const col = listingKanbanColumnId(listing.pipeline_stage);

  if (status === "withdrawn") {
    return { key: "withdrawn", label: "Withdrawn", badgeClass: STAGE_STYLES.withdrawn };
  }
  if (status === "sold" || col === "settled" || col === "past_client") {
    return { key: "sold", label: "Sold", badgeClass: STAGE_STYLES.sold };
  }
  if (col === "unconditional") {
    return { key: "exchanged", label: "Exchanged", badgeClass: STAGE_STYLES.exchanged };
  }
  if (col === "under_contract" || status === "pending") {
    return { key: "under_offer", label: "Under offer", badgeClass: STAGE_STYLES.under_offer };
  }
  if (col === "listing" && status === "active") {
    if (journeyHintPreMarket(listing.journey_stage)) {
      return { key: "pre_market", label: "Pre-market", badgeClass: STAGE_STYLES.pre_market };
    }
    return { key: "active", label: "Active", badgeClass: STAGE_STYLES.active };
  }
  if (col === "listing") {
    return { key: "active", label: "Active", badgeClass: STAGE_STYLES.active };
  }
  return { key: "appraisal", label: "Appraisal", badgeClass: STAGE_STYLES.appraisal };
}

export type CampaignHealth = "on_track" | "needs_attention" | "stalled" | "cold";

export type CampaignHealthResult = {
  status: CampaignHealth;
  label: string;
  dotClass: string;
  description: string;
};

/**
 * Automated health (P1: no overdue tasks — placeholder false until tasks wired).
 */
export function computeListingCampaignHealth(
  listing: {
    lead_temperature: string;
    status?: string | null;
    campaign_last_enquiry_at?: string | null;
    campaign_next_inspection_at?: string | null;
    campaign_start_at?: string | null;
    created_at: string;
    pipeline_stage?: string | null;
    key_date_settlement?: string | null;
  },
  options?: { hasOverdueTasks?: boolean },
): CampaignHealthResult {
  const status = (listing.status ?? "").toLowerCase();
  const col = listingKanbanColumnId(listing.pipeline_stage);

  if (status === "sold" || col === "settled" || col === "past_client") {
    const settlementIso = listing.key_date_settlement?.slice(0, 10);
    if (settlementIso) {
      try {
        const settlement = parseISO(`${settlementIso}T12:00:00`);
        const days = differenceInCalendarDays(settlement, new Date());
        if (days > 0) {
          return {
            status: "on_track",
            label: "Settling",
            dotClass: "bg-emerald-500",
            description: `Settlement in ${days} day${days === 1 ? "" : "s"} — focus on conditions and handover.`,
          };
        }
        if (days === 0) {
          return {
            status: "on_track",
            label: "Settling today",
            dotClass: "bg-emerald-500",
            description: "Settlement is today.",
          };
        }
        return {
          status: "on_track",
          label: "Sold",
          dotClass: "bg-emerald-500",
          description: `Settled ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago.`,
        };
      } catch {
        /* fall through */
      }
    }
    return {
      status: "on_track",
      label: "Sold",
      dotClass: "bg-emerald-500",
      description: "Sale complete — settlement tracking applies.",
    };
  }

  const hasOverdue = options?.hasOverdueTasks ?? false;
  const temp = (listing.lead_temperature || "").toUpperCase();
  if (temp === "LEAD_COLD" || temp.includes("COLD")) {
    return {
      status: "cold",
      label: "Cold",
      dotClass: "bg-zinc-500",
      description: "Lead flagged cold — revisit strategy or nurture.",
    };
  }

  if (col === "appraisal" || col === "past_client") {
    return {
      status: "on_track",
      label: "On track",
      dotClass: "bg-emerald-500",
      description: "Campaign metrics not applied at this stage.",
    };
  }

  const now = new Date();
  const anchor = listing.campaign_start_at || listing.created_at;
  const daysSinceLive = differenceInCalendarDays(now, new Date(anchor));

  const lastEnq = listing.campaign_last_enquiry_at
    ? new Date(listing.campaign_last_enquiry_at)
    : null;
  const daysSinceEnquiry = lastEnq ? differenceInCalendarDays(now, lastEnq) : null;

  const nextInsp = listing.campaign_next_inspection_at
    ? new Date(listing.campaign_next_inspection_at)
    : null;
  const hasUpcomingInspection = nextInsp != null && !Number.isNaN(nextInsp.getTime()) && nextInsp > now;

  if (hasOverdue) {
    return {
      status: "needs_attention",
      label: "Needs attention",
      dotClass: "bg-amber-500",
      description: "Overdue tasks on this campaign.",
    };
  }

  if (daysSinceEnquiry !== null && daysSinceEnquiry <= 7) {
    return {
      status: "on_track",
      label: "On track",
      dotClass: "bg-emerald-500",
      description: "Recent enquiry activity within 7 days.",
    };
  }

  if (daysSinceEnquiry !== null && daysSinceEnquiry > 7 && daysSinceEnquiry <= 14) {
    return {
      status: "needs_attention",
      label: "Needs attention",
      dotClass: "bg-amber-500",
      description: "No enquiry in over a week — follow up.",
    };
  }

  if (daysSinceEnquiry !== null && daysSinceEnquiry > 14) {
    if (!hasUpcomingInspection) {
      return {
        status: "stalled",
        label: "Stalled",
        dotClass: "bg-red-500",
        description: "No enquiry in 14+ days and no upcoming inspection.",
      };
    }
    return {
      status: "needs_attention",
      label: "Needs attention",
      dotClass: "bg-amber-500",
      description: "Quiet enquiry flow — inspection scheduled may help.",
    };
  }

  // No enquiry recorded yet
  if (daysSinceLive <= 7) {
    return {
      status: "on_track",
      label: "On track",
      dotClass: "bg-emerald-500",
      description: "New campaign — log enquiries as they arrive.",
    };
  }
  if (daysSinceLive <= 14) {
    return {
      status: "needs_attention",
      label: "Needs attention",
      dotClass: "bg-amber-500",
      description: "No logged enquiries yet — time to drive activity.",
    };
  }
  if (!hasUpcomingInspection) {
    return {
      status: "stalled",
      label: "Stalled",
      dotClass: "bg-red-500",
      description: "No enquiries logged and no inspection booked.",
    };
  }
  return {
    status: "needs_attention",
    label: "Needs attention",
    dotClass: "bg-amber-500",
    description: "Limited momentum — use inspections and outreach.",
  };
}

export function domToneClasses(domDays: number | null): { text: string; bg: string; border: string } {
  if (domDays == null) {
    return { text: "text-muted-foreground", bg: "bg-muted/50", border: "border-border" };
  }
  if (domDays < 14) {
    return { text: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-500/30" };
  }
  if (domDays <= 30) {
    return { text: "text-amber-400", bg: "bg-amber-950/40", border: "border-amber-500/30" };
  }
  return { text: "text-red-400", bg: "bg-red-950/40", border: "border-red-500/30" };
}

export function formatRelativeShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

export function formatCampaignDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy");
  } catch {
    return "—";
  }
}

export function daysInPrimaryStage(listing: {
  updated_at: string;
  pipeline_stage: string | null;
}): number {
  return Math.max(0, differenceInCalendarDays(new Date(), new Date(listing.updated_at)));
}

export function secondaryListingTags(listing: {
  created_at: string;
  lead_temperature: string;
  status: string | null;
  pipeline_stage: string | null;
}): string[] {
  const tags: string[] = [];
  const col: ListingKanbanColumnId = listingKanbanColumnId(listing.pipeline_stage);
  if (differenceInCalendarDays(new Date(), new Date(listing.created_at)) <= 14) {
    tags.push("New listing");
  }
  const temp = (listing.lead_temperature || "").toUpperCase();
  if (temp === "LEAD_COLD" || temp.includes("COLD")) {
    tags.push("Lead cold");
  }
  if ((listing.status || "").toLowerCase() === "withdrawn") {
    tags.push("Off-market");
  }
  if (
    col === "under_contract" &&
    (listing.status || "").toLowerCase() !== "pending" &&
    (listing.status || "").toLowerCase() !== "withdrawn"
  ) {
    tags.push("Under contract");
  }
  return tags;
}
