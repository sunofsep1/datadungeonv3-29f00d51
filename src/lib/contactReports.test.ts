import { describe, expect, it } from "vitest";
import {
  buildContactAnniversaryReport,
  buildContactSourceReport,
  buildContactSuburbBreakdownReport,
  buildContactUnsubscribedReport,
  buildGciByListingReport,
  buildProspectPropertyContactsReport,
  contactSuburbKey,
} from "./contactReports";
import type { ContactSubscriptionKind } from "./contactSubscriptions";

describe("buildContactSourceReport", () => {
  it("groups by source", () => {
    const rows = buildContactSourceReport([
      { source: "Referral", created_at: "2026-01-01" },
      { source: "Referral", created_at: "2026-02-01" },
      { source: null, created_at: "2026-03-01" },
    ]);
    expect(rows.find((r) => r.source === "Referral")?.count).toBe(2);
    expect(rows.find((r) => r.source === "Unknown")?.count).toBe(1);
  });
});

describe("buildContactUnsubscribedReport", () => {
  it("lists contacts with explicit opt-outs", () => {
    const index = new Map<string, Map<ContactSubscriptionKind, boolean>>([
      [
        "c1",
        new Map([
          ["newsletters", false],
          ["property_updates", true],
        ] as [ContactSubscriptionKind, boolean][]),
      ],
    ]);
    const rows = buildContactUnsubscribedReport(
      [{ id: "c1", name: "Ann", email: "a@x.com" }],
      index,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.unsubscribedKinds).toEqual(["Newsletters"]);
  });
});

describe("buildContactSuburbBreakdownReport", () => {
  it("groups by suburb and state", () => {
    expect(contactSuburbKey("Brisbane", "qld")).toBe("Brisbane, QLD");
    const rows = buildContactSuburbBreakdownReport([
      { city: "Brisbane", state: "QLD" },
      { city: "Brisbane", state: "QLD" },
      { city: null, state: null },
    ]);
    expect(rows.find((r) => r.suburbKey === "Brisbane, QLD")?.count).toBe(2);
    expect(rows.find((r) => r.suburbKey === "Unknown")?.count).toBe(1);
  });
});

describe("buildContactAnniversaryReport", () => {
  it("includes contacts with birthday within window", () => {
    const from = new Date("2026-05-23T12:00:00");
    const rows = buildContactAnniversaryReport(
      [{ id: "c1", name: "Ann", date_of_birth: "1990-05-25" }],
      30,
      from,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.daysUntil).toBe(2);
  });
});

describe("buildProspectPropertyContactsReport", () => {
  it("lists contacts with property links", () => {
    const rows = buildProspectPropertyContactsReport([
      {
        id: "c1",
        name: "Bob",
        contact_property_links: [
          { role: "owner", properties: { address_line1: "1 Main St", city: "Brisbane" } },
        ],
      },
      { id: "c2", name: "No props", contact_property_links: [] },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.propertyCount).toBe(1);
    expect(rows[0]?.roles).toContain("owner");
  });
});

describe("buildGciByListingReport", () => {
  it("sorts by projected GCI descending", () => {
    const rows = buildGciByListingReport(
      [
        { id: "a", address: "Low", pipeline_stage: "listing", searchPrice: 1_000_000 },
        { id: "b", address: "High", pipeline_stage: "listing", searchPrice: 2_000_000 },
      ],
      2.5,
      () => "Listed",
    );
    expect(rows[0]?.address).toBe("High");
    expect(rows[0]?.projectedGci).toBe(50_000);
  });
});
