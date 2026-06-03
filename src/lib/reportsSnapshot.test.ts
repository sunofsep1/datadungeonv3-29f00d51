import { describe, expect, it } from "vitest";
import { buildReportsSnapshot } from "./reportsSnapshot";

const base = {
  id: "1",
  address: "1 Test St",
  pipeline_stage: "listing",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
  price: 2_000_000,
  search_price: 2_000_000,
  display_price: null,
};

describe("buildReportsSnapshot", () => {
  it("aggregates alert counts", () => {
    const snap = buildReportsSnapshot(
      [
        {
          ...base,
          key_date_agency_expiry: "2026-05-10T00:00:00.000Z",
          key_date_listed: "2026-01-01T00:00:00.000Z",
        },
        {
          ...base,
          id: "2",
          pipeline_stage: "under_contract",
          key_date_settlement: "2026-05-25T00:00:00.000Z",
        },
      ],
      2.5,
      new Date("2026-05-21"),
    );
    expect(snap.expiredAuthorities).toBe(1);
    expect(snap.pipelineCount).toBe(2);
    expect(snap.domOver60).toBeGreaterThan(0);
    expect(snap.settlementsWithin30).toBe(1);
  });
});
