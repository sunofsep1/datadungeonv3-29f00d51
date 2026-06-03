import { describe, expect, it } from "vitest";
import {
  buildListingSyncPatchFromOffer,
  pickActiveContractOffer,
  pipelineStageFromOfferStatus,
  portalStatusFromOfferStatus,
} from "@/lib/listingOfferPipelineSync";
import type { ListingOffer } from "@/hooks/useListingOffers";

const baseOffer = (overrides: Partial<ListingOffer>): ListingOffer =>
  ({
    id: "1",
    listing_id: "L1",
    user_id: "u1",
    ref_code: "OF-001",
    offer_date: "2026-01-01",
    offer_price: 800000,
    buyer_contact_id: "c1",
    buyer_solicitor_contact_id: null,
    investor: false,
    inclusions: null,
    special_conditions: null,
    notes: null,
    status: "submitted",
    exchange_date: null,
    settlement_date: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  }) as ListingOffer;

describe("listingOfferPipelineSync", () => {
  it("picks unconditional over conditional", () => {
    const offers = [
      baseOffer({ id: "a", status: "conditional" }),
      baseOffer({ id: "b", status: "unconditional" }),
    ];
    expect(pickActiveContractOffer(offers)?.id).toBe("b");
  });

  it("maps conditional to under_contract pipeline", () => {
    expect(pipelineStageFromOfferStatus("conditional")).toBe("under_contract");
    expect(portalStatusFromOfferStatus("conditional")).toBe("under_contract");
  });

  it("sets key dates from offer", () => {
    const patch = buildListingSyncPatchFromOffer({
      status: "conditional",
      exchange_date: "2026-03-01",
    });
    expect(patch.pipeline_stage).toBe("under_contract");
    expect(patch.key_date_contract).toBe("2026-03-01");
  });

  it("sets settlement key date when settled", () => {
    const patch = buildListingSyncPatchFromOffer({
      status: "settled",
      settlement_date: "2026-06-15",
    });
    expect(patch.pipeline_stage).toBe("settled");
    expect(patch.key_date_settlement).toBe("2026-06-15");
  });
});
