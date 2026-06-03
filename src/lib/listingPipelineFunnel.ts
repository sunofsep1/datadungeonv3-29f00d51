import {
  LISTING_PIPELINE_STAGE_OPTIONS,
  listingKanbanColumnId,
  type ListingKanbanColumnId,
} from "@/lib/listingKanbanStages";
import { listingSearchPrice, type ListingPriceSource } from "@/lib/listingPriceFields";

/** Stages shown in the Reapit-style funnel (active stock; past_client excluded). */
export const LISTING_FUNNEL_STAGE_IDS: ListingKanbanColumnId[] = [
  "appraisal",
  "listing",
  "under_contract",
  "unconditional",
  "settled",
];

export type ListingFunnelRow = {
  stageId: ListingKanbanColumnId;
  label: string;
  count: number;
  totalValue: number;
  projectedGci: number;
};

export type ListingPipelineFunnelResult = {
  rows: ListingFunnelRow[];
  totals: { count: number; totalValue: number; projectedGci: number };
};

export function buildListingPipelineFunnel(
  listings: (ListingPriceSource & { pipeline_stage?: string | null })[],
  commissionRatePct: number,
): ListingPipelineFunnelResult {
  const rate = Number.isFinite(commissionRatePct) ? Math.max(0, commissionRatePct) : 0;
  const labelById = Object.fromEntries(LISTING_PIPELINE_STAGE_OPTIONS.map((o) => [o.id, o.label]));

  const buckets = new Map<ListingKanbanColumnId, { count: number; totalValue: number }>();
  for (const id of LISTING_FUNNEL_STAGE_IDS) {
    buckets.set(id, { count: 0, totalValue: 0 });
  }

  for (const listing of listings) {
    const col = listingKanbanColumnId(listing.pipeline_stage);
    if (col === "past_client") continue;
    const bucket = buckets.get(col);
    if (!bucket) continue;
    bucket.count += 1;
    const val = listingSearchPrice(listing);
    if (val != null) bucket.totalValue += val;
  }

  const rows: ListingFunnelRow[] = LISTING_FUNNEL_STAGE_IDS.map((stageId) => {
    const b = buckets.get(stageId) ?? { count: 0, totalValue: 0 };
    return {
      stageId,
      label: labelById[stageId] ?? stageId,
      count: b.count,
      totalValue: b.totalValue,
      projectedGci: (b.totalValue * rate) / 100,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      count: acc.count + r.count,
      totalValue: acc.totalValue + r.totalValue,
      projectedGci: acc.projectedGci + r.projectedGci,
    }),
    { count: 0, totalValue: 0, projectedGci: 0 },
  );

  return { rows, totals };
}

export function formatFunnelAud(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}
