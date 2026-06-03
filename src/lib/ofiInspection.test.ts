import { describe, expect, it } from "vitest";
import {
  addMinutesToIso,
  buildOfiCheckInPath,
  buildOfiCheckInUrl,
  buildOfiBrochurePrintPath,
  partitionInspections,
} from "./ofiInspection";

describe("ofiInspection", () => {
  it("adds duration to start ISO", () => {
    const end = addMinutesToIso("2026-05-19T10:00:00.000Z", 45);
    expect(end).toBe("2026-05-19T10:45:00.000Z");
  });

  it("builds check-in path and URL", () => {
    expect(buildOfiCheckInPath("abc123")).toBe("/ofi/check-in/abc123");
    expect(buildOfiCheckInUrl("tok", "https://app.example.com")).toBe(
      "https://app.example.com/ofi/check-in/tok",
    );
    expect(buildOfiBrochurePrintPath("abc")).toBe("/ofi/brochure/abc/print");
  });

  it("partitions upcoming vs past", () => {
    const now = new Date("2026-05-19T12:00:00.000Z");
    const rows = [
      { id: "1", starts_at: "2026-05-19T14:00:00.000Z" },
      { id: "2", starts_at: "2026-05-18T10:00:00.000Z" },
    ];
    const { upcoming, past } = partitionInspections(rows, now);
    expect(upcoming.map((r) => r.id)).toEqual(["1"]);
    expect(past.map((r) => r.id)).toEqual(["2"]);
  });
});
