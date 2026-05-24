import { describe, expect, it } from "vitest";
import {
  activeRequirementCriteria,
  findContactsByRequirementsSearch,
  requirementHasCriterion,
  requirementMatchesSearch,
} from "@/lib/buyerRequirementsSearch";
import type { BuyerRequirementRecord } from "@/lib/buyerRequirementMatch";

const baseReq = (overrides: Partial<BuyerRequirementRecord> = {}): BuyerRequirementRecord => ({
  id: "r1",
  contact_id: "c1",
  suburbs: ["Bulimba"],
  price_min: 800000,
  price_max: 1200000,
  beds_min: 3,
  ...overrides,
});

describe("buyerRequirementsSearch", () => {
  it("lists active criteria from search", () => {
    expect(
      activeRequirementCriteria({ suburbs: ["Bulimba"], beds_min: 3 }),
    ).toEqual(["suburbs", "beds"]);
  });

  it("matches suburb and price overlap", () => {
    expect(
      requirementMatchesSearch(baseReq(), {
        suburbs: ["bulimba"],
        price_min: 900000,
        price_max: 1100000,
      }),
    ).toBe(true);
  });

  it("excludes when strict missing beds on requirement", () => {
    expect(
      requirementMatchesSearch(baseReq({ beds_min: null }), {
        beds_min: 3,
        excludeMissingCriteria: true,
      }),
    ).toBe(false);
    expect(requirementHasCriterion(baseReq({ beds_min: null }), "beds")).toBe(false);
  });

  it("finds contacts by any matching requirement", () => {
    const hits = findContactsByRequirementsSearch(
      [
        baseReq(),
        baseReq({ id: "r2", contact_id: "c2", suburbs: ["Hamilton"] }),
      ],
      { suburbs: ["Bulimba"] },
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].contactId).toBe("c1");
  });
});
