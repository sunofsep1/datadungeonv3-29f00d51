import { describe, expect, it } from "vitest";
import {
  buildContactSourceReport,
  buildContactUnsubscribedReport,
  buildGciByListingReport,
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
