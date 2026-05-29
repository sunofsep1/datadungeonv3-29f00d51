import type { ListingKanbanColumnId } from "@/lib/listingKanbanStages";
import type { ListingOffer } from "@/hooks/useListingOffers";

const ACTIVE_CONTRACT_STATUSES = new Set(["accepted", "conditional", "unconditional"]);

const ACTIVE_PRIORITY: Record<string, number> = {
  unconditional: 0,
  conditional: 1,
  accepted: 2,
};

/** Pick the current active contract offer for a listing (if any). */
export function pickActiveContractOffer(offers: ListingOffer[]): ListingOffer | null {
  const active = offers.filter((o) => ACTIVE_CONTRACT_STATUSES.has(o.status));
  if (active.length === 0) return null;
  active.sort((a, b) => (ACTIVE_PRIORITY[a.status] ?? 9) - (ACTIVE_PRIORITY[b.status] ?? 9));
  return active[0] ?? null;
}

export function pipelineStageFromOfferStatus(status: string): ListingKanbanColumnId | null {
  switch (status) {
    case "conditional":
      return "under_contract";
    case "unconditional":
      return "unconditional";
    case "settled":
      return "settled";
    case "fallen_through":
      return "listing";
    default:
      return null;
  }
}

export function portalStatusFromOfferStatus(
  status: string,
): "available" | "under_contract" | "sold" | null {
  if (status === "conditional" || status === "unconditional") return "under_contract";
  if (status === "settled") return "sold";
  if (status === "fallen_through" || status === "withdrawn" || status === "rejected") {
    return "available";
  }
  return null;
}

export type ListingSyncPatch = {
  pipeline_stage?: ListingKanbanColumnId;
  key_date_contract?: string | null;
  key_date_settlement?: string | null;
};

/** Listing fields to update when an offer reaches a contract lifecycle status. */
export function buildListingSyncPatchFromOffer(offer: {
  status: string;
  exchange_date?: string | null;
  settlement_date?: string | null;
  expected_settlement_date?: string | null;
}): ListingSyncPatch {
  const patch: ListingSyncPatch = {};
  const stage = pipelineStageFromOfferStatus(offer.status);
  if (stage) patch.pipeline_stage = stage;

  if (offer.status === "conditional" && offer.exchange_date) {
    patch.key_date_contract = offer.exchange_date.slice(0, 10);
  }
  if (offer.status === "settled") {
    const sd = offer.settlement_date ?? offer.expected_settlement_date;
    if (sd) patch.key_date_settlement = sd.slice(0, 10);
  }
  return patch;
}

export function shouldShowActiveContractPanel(
  pipelineStage: string | null | undefined,
  offers: ListingOffer[],
): boolean {
  const stage = (pipelineStage ?? "").toLowerCase();
  if (stage === "under_contract" || stage === "unconditional") return true;
  return pickActiveContractOffer(offers) != null;
}
