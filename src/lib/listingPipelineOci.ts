import { listingSearchPrice, type ListingPriceSource } from "@/lib/listingPriceFields";

export type StageOciSummary = {
  count: number;
  totalValue: number;
  oci: number;
};

/** OCI (On Commission Income) = sum of listing value × commission rate for a stage bucket. */
export function computeStageOci(
  listings: (ListingPriceSource & { price?: number | null })[],
  commissionRatePct: number,
): StageOciSummary {
  const rate = Number.isFinite(commissionRatePct) ? Math.max(0, commissionRatePct) : 0;
  let totalValue = 0;
  for (const listing of listings) {
    const val = listingSearchPrice(listing) ?? listing.price ?? 0;
    if (Number.isFinite(val) && val > 0) totalValue += val;
  }
  return {
    count: listings.length,
    totalValue,
    oci: (totalValue * rate) / 100,
  };
}

export function formatOciCompact(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
    notation: "compact",
    compactDisplay: "short",
  }).format(amount);
}
