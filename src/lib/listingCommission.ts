import { listingKanbanColumnId } from "@/lib/listingKanbanStages";
import { isContractStatus } from "@/lib/listingOffers";

const GST_RATE = 0.1;

export type ListingCommissionInput = {
  salePrice: number;
  grossCommissionPct: number;
};

export type ListingCommissionTotals = {
  salePrice: number;
  grossCommissionPct: number;
  grossExGst: number;
  gstAmount: number;
  grossIncGst: number;
};

export type CommissionSplitRow = {
  id: string;
  agent_name: string;
  split_pct: number;
};

export type CommissionSplitAmount = CommissionSplitRow & {
  amountExGst: number;
  amountIncGst: number;
};

export function isListingCommissionUnlocked(
  offers: { status: string }[],
  pipelineStage?: string | null,
): boolean {
  if (offers.some((o) => isContractStatus(o.status))) return true;
  const col = listingKanbanColumnId(pipelineStage);
  return col === "under_contract" || col === "unconditional" || col === "settled" || col === "past_client";
}

export function calculateListingCommission(input: ListingCommissionInput): ListingCommissionTotals {
  const salePrice = Math.max(0, input.salePrice);
  const grossCommissionPct = Math.min(100, Math.max(0, input.grossCommissionPct));
  const grossExGst = salePrice * (grossCommissionPct / 100);
  const gstAmount = grossExGst * GST_RATE;
  const grossIncGst = grossExGst + gstAmount;

  return {
    salePrice,
    grossCommissionPct,
    grossExGst,
    gstAmount,
    grossIncGst,
  };
}

export function allocateCommissionSplits(
  totals: ListingCommissionTotals,
  splits: CommissionSplitRow[],
): CommissionSplitAmount[] {
  if (!splits.length) return [];

  return splits.map((row) => {
    const pct = Math.min(100, Math.max(0, Number(row.split_pct) || 0));
    const amountExGst = totals.grossExGst * (pct / 100);
    const amountIncGst = totals.grossIncGst * (pct / 100);
    return {
      ...row,
      split_pct: pct,
      amountExGst,
      amountIncGst,
    };
  });
}

export function totalSplitPct(splits: { split_pct: number }[]): number {
  return splits.reduce((sum, row) => sum + (Number(row.split_pct) || 0), 0);
}

/** Prefer contract/accepted offer price, else listing search price. */
export function commissionSalePriceFromOffers(
  offers: { status: string; offer_price: number }[],
  fallbackPrice: number | null,
): number | null {
  const contract = offers.find((o) => isContractStatus(o.status));
  if (contract?.offer_price) return Number(contract.offer_price);

  const accepted = offers.find((o) => o.status === "accepted");
  if (accepted?.offer_price) return Number(accepted.offer_price);

  if (fallbackPrice != null && fallbackPrice > 0) return fallbackPrice;
  return null;
}

export function formatCommissionAud(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}
