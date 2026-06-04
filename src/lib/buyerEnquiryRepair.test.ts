import { describe, expect, it } from "vitest";
import { buildRepairExclusions, linksEligibleForOwnerRepair, normalizeRepairName } from "@/lib/buyerEnquiryRepair";

describe("buyerEnquiryRepair", () => {
  it("normalizes names for exclusion", () => {
    expect(normalizeRepairName(" Corbin  Evans ")).toBe("corbin evans");
  });

  it("excludes key buyers and named contacts", () => {
    const exclusions = buildRepairExclusions({
      keyBuyerContactIds: ["c1"],
      extraNames: ["Ashlee Evans"],
    });
    const links = [
      { id: "1", contact_id: "c1", property_id: "p1", role: "owner" },
      { id: "2", contact_id: "c2", property_id: "p1", role: "owner" },
    ];
    const names = new Map([
      ["c1", "Corbin Evans"],
      ["c2", "Ashlee Evans"],
    ]);
    const eligible = linksEligibleForOwnerRepair(links, names, exclusions);
    expect(eligible).toHaveLength(0);
  });

  it("includes mis-linked owners not excluded", () => {
    const exclusions = buildRepairExclusions({ extraNames: ["Corbin Evans"] });
    const links = [{ id: "1", contact_id: "c9", property_id: "p1", role: "owner" }];
    const names = new Map([["c9", "Nic Wayne"]]);
    expect(linksEligibleForOwnerRepair(links, names, exclusions)).toHaveLength(1);
  });
});
