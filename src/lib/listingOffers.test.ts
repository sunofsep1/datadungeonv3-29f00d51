import { describe, expect, it } from "vitest";
import {
  filterOffersByTab,
  isContractStatus,
  offerStatusActions,
} from "@/lib/listingOffers";

describe("listingOffers", () => {
  const rows = [
    { id: "1", status: "submitted" },
    { id: "2", status: "conditional" },
    { id: "3", status: "settled" },
  ];

  it("filters offers vs contracts tabs", () => {
    expect(filterOffersByTab(rows, "offers")).toHaveLength(1);
    expect(filterOffersByTab(rows, "contracts")).toHaveLength(2);
    expect(filterOffersByTab(rows, "all")).toHaveLength(3);
  });

  it("identifies contract statuses", () => {
    expect(isContractStatus("conditional")).toBe(true);
    expect(isContractStatus("submitted")).toBe(false);
  });

  it("suggests accept from submitted", () => {
    const actions = offerStatusActions("submitted");
    expect(actions.some((a) => a.value === "accepted")).toBe(true);
  });

  it("suggests exchange from accepted", () => {
    const actions = offerStatusActions("accepted");
    expect(actions.some((a) => a.value === "conditional")).toBe(true);
  });
});
