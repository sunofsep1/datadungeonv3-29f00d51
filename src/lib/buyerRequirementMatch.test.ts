import { describe, expect, it } from "vitest";
import {
  buildListingMatchProfile,
  matchBuyersToListing,
  matchListingsToRequirements,
  parseSuburbFromAddress,
  profileRequirementFromContact,
  requirementMatchesListing,
} from "@/lib/buyerRequirementMatch";

describe("buyerRequirementMatch", () => {
  it("parses suburb from AU address", () => {
    expect(parseSuburbFromAddress("12 Smith St, Bulimba QLD 4171")).toBe("Bulimba");
  });

  it("matches suburb and price", () => {
    const listing = buildListingMatchProfile(
      { address: "1 Test Rd, Hawthorne QLD 4171", search_price: 1_200_000, bedrooms: 4, bathrooms: 2 },
      null,
    );
    const { matches, reasons } = requirementMatchesListing(
      {
        id: "r1",
        contact_id: "c1",
        suburbs: ["Hawthorne"],
        price_min: 1_000_000,
        price_max: 1_500_000,
        beds_min: 3,
      },
      listing,
    );
    expect(matches).toBe(true);
    expect(reasons).toContain("Suburb");
    expect(reasons).toContain("Price");
  });

  it("rejects when suburb does not match", () => {
    const listing = buildListingMatchProfile(
      { address: "1 Test Rd, Bulimba QLD 4171", price: 900_000 },
      null,
    );
    const { matches } = requirementMatchesListing(
      { id: "r1", contact_id: "c1", suburbs: ["New Farm"] },
      listing,
    );
    expect(matches).toBe(false);
  });

  it("dedupes best requirement per contact", () => {
    const listing = buildListingMatchProfile(
      { address: "X, Bulimba QLD 4171", price: 1_000_000, bedrooms: 4 },
      null,
    );
    const contacts = new Map([
      ["c1", { id: "c1", name: "Ann", do_not_contact: false }],
    ]);
    const results = matchBuyersToListing(
      listing,
      [
        { id: "r1", contact_id: "c1", suburbs: ["Bulimba"], price_min: 800_000 },
        { id: "r2", contact_id: "c1", suburbs: ["Bulimba"], price_min: 900_000, beds_min: 4 },
      ],
      contacts,
    );
    expect(results).toHaveLength(1);
    expect(results[0].requirementId).toBe("r2");
  });

  it("builds profile requirement from contact columns", () => {
    const req = profileRequirementFromContact({
      id: "c1",
      preferred_suburbs: ["Teneriffe"],
      buying_budget_max: 2_000_000,
    });
    expect(req?.suburbs).toEqual(["Teneriffe"]);
    expect(req?.price_max).toBe(2_000_000);
    expect(req?._source).toBe("profile");
  });

  it("matches listings to contact requirements (reverse)", () => {
    const requirements = [
      { id: "r1", contact_id: "c1", suburbs: ["Bulimba"], price_max: 1_500_000, beds_min: 3 },
    ];
    const listings = [
      {
        id: "l1",
        address: "1 A St, Bulimba QLD 4171",
        profile: buildListingMatchProfile(
          { address: "1 A St, Bulimba QLD 4171", search_price: 1_200_000, bedrooms: 4 },
          null,
        ),
      },
      {
        id: "l2",
        address: "2 B St, New Farm QLD 4005",
        profile: buildListingMatchProfile(
          { address: "2 B St, New Farm QLD 4005", search_price: 1_200_000, bedrooms: 4 },
          null,
        ),
      },
    ];
    const results = matchListingsToRequirements(requirements, listings);
    expect(results).toHaveLength(1);
    expect(results[0].listingId).toBe("l1");
    expect(results[0].matchReasons).toContain("Suburb");
  });
});
