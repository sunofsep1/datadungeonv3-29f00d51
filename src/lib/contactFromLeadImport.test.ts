import { describe, expect, it } from "vitest";
import { buildContactInsertFromLeadRow, splitDisplayName } from "./contactFromLeadImport";
import type { LeadInsert } from "@/hooks/useLeads";

describe("splitDisplayName", () => {
  it("splits on first space", () => {
    expect(splitDisplayName("Jane Q Public")).toEqual({ first: "Jane", last: "Q Public" });
  });
  it("handles single token", () => {
    expect(splitDisplayName("Madonna")).toEqual({ first: "Madonna", last: "" });
  });
});

describe("buildContactInsertFromLeadRow", () => {
  const uid = "00000000-0000-4000-8000-000000000001";

  it("matches inbound-lead shape for a typical row", () => {
    const row: LeadInsert = {
      name: "Sam Buyer",
      email: "s@example.com",
      phone: "0412345678",
      source: "open_home",
      notes: "Keen on units",
      property_interest: "2br near CBD",
      budget_min: 500000,
      budget_max: 700000,
      status: "hot",
    };
    expect(buildContactInsertFromLeadRow(row, uid)).toMatchObject({
      user_id: uid,
      owner_id: uid,
      first_name: "Sam",
      last_name: "Buyer",
      name: "Sam Buyer",
      email: "s@example.com",
      phone: "0412345678",
      source: "open_home",
      notes: "Keen on units",
      contact_category: "warm_lead",
      property_requirements: { summary: "2br near CBD" },
      buying_budget_min: 500000,
      buying_budget_max: 700000,
      status: "hot",
    });
  });

  it("defaults source to csv_import", () => {
    const row: LeadInsert = { name: "X" };
    const p = buildContactInsertFromLeadRow(row, uid);
    expect(p.source).toBe("csv_import");
    expect(Object.prototype.hasOwnProperty.call(p, "status")).toBe(false);
  });
});
