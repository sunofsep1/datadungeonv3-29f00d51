import { afterEach, describe, expect, it, vi } from "vitest";
import { buildContactUrgency, tierFromScore } from "@/lib/contactUrgency";

function isoHoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("contact urgency tiers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps score bands to crm tiers", () => {
    expect(tierFromScore(150)).toBe("immediate");
    expect(tierFromScore(90)).toBe("priority");
    expect(tierFromScore(40)).toBe("planned");
    expect(tierFromScore(10)).toBe("backlog");
  });

  it("rates overdue follow-up as immediate", () => {
    const result = buildContactUrgency({
      contactId: "c1",
      lastActivityAt: isoHoursFromNow(-24 * 40),
      taskDueAts: [isoHoursFromNow(-30)],
      sequenceTaskDueAts: [],
      appointmentDates: [],
    });
    expect(result.tier).toBe("immediate");
    expect(result.reasons.join(" ")).toContain("overdue");
  });

  it("rates near-term workload as priority or planned", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T15:00:00.000Z"));
    const result = buildContactUrgency({
      contactId: "c2",
      lastActivityAt: new Date("2026-04-20T15:00:00.000Z").toISOString(),
      taskDueAts: [new Date("2026-05-04T15:00:00.000Z").toISOString()],
      sequenceTaskDueAts: [],
      appointmentDates: [],
    });
    expect(["priority", "planned"]).toContain(result.tier);
  });

  it("respects manual urgency tier override", () => {
    const result = buildContactUrgency({
      contactId: "c3",
      manualTier: "priority",
      lastActivityAt: isoHoursFromNow(-2),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
    });
    expect(result.tier).toBe("priority");
    expect(result.reasons[0]).toContain("manually set");
  });

  // ── Lead temperature cadence ──────────────────────────────────────────────

  it("flags hot lead past 7-day cadence as priority", () => {
    const result = buildContactUrgency({
      contactId: "c4",
      lastActivityAt: isoDaysAgo(8),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
      leadTemperature: "LEAD_HOT",
    });
    expect(["immediate", "priority"]).toContain(result.tier);
    expect(result.reasons.join(" ")).toContain("7-day cadence overdue");
  });

  it("warns hot lead approaching 7-day cadence at 5–6 days", () => {
    const result = buildContactUrgency({
      contactId: "c5",
      lastActivityAt: isoDaysAgo(5),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
      leadTemperature: "LEAD_HOT",
    });
    expect(result.reasons.join(" ")).toContain("approaching 7-day cadence");
    expect(result.score).toBeGreaterThanOrEqual(35); // at least planned
  });

  it("flags warm lead past 14-day cadence as planned or higher", () => {
    const result = buildContactUrgency({
      contactId: "c6",
      lastActivityAt: isoDaysAgo(15),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
      leadTemperature: "LEAD_WARM",
    });
    expect(["immediate", "priority", "planned"]).toContain(result.tier);
    expect(result.reasons.join(" ")).toContain("14-day cadence overdue");
  });

  it("does not apply cadence signal to cold leads", () => {
    const result = buildContactUrgency({
      contactId: "c7",
      lastActivityAt: isoDaysAgo(20),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
      leadTemperature: "LEAD_COLD",
    });
    expect(result.reasons.join(" ")).not.toContain("cadence");
  });

  // ── No next-touch date on high-value contacts ─────────────────────────────

  it("adds urgency for hot lead with no next-touch date", () => {
    const withNext = buildContactUrgency({
      contactId: "c8a",
      lastActivityAt: isoDaysAgo(1),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
      leadTemperature: "LEAD_HOT",
      nextTouchDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const withoutNext = buildContactUrgency({
      contactId: "c8b",
      lastActivityAt: isoDaysAgo(1),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
      leadTemperature: "LEAD_HOT",
      nextTouchDate: null,
    });
    expect(withoutNext.score).toBeGreaterThan(withNext.score);
    expect(withoutNext.reasons.join(" ")).toContain("no next-touch date");
  });

  it("adds urgency for top_100 contact with no next-touch date", () => {
    const result = buildContactUrgency({
      contactId: "c9",
      lastActivityAt: isoDaysAgo(1),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
      contactCategory: "top_100",
      nextTouchDate: null,
    });
    expect(result.reasons.join(" ")).toContain("no next-touch date");
  });

  it("does not add no-next-touch urgency for ordinary prospect", () => {
    const result = buildContactUrgency({
      contactId: "c10",
      lastActivityAt: isoDaysAgo(1),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
      contactCategory: "prospect",
      nextTouchDate: null,
    });
    expect(result.reasons.join(" ")).not.toContain("no next-touch date");
  });

  // ── Sequence step 72h early warning ──────────────────────────────────────

  it("adds early-warning score for sequence step due in 24–72h", () => {
    const early = buildContactUrgency({
      contactId: "c11",
      lastActivityAt: isoDaysAgo(1),
      taskDueAts: [],
      sequenceTaskDueAts: [isoHoursFromNow(48)],
      appointmentDates: [],
    });
    const none = buildContactUrgency({
      contactId: "c12",
      lastActivityAt: isoDaysAgo(1),
      taskDueAts: [],
      sequenceTaskDueAts: [],
      appointmentDates: [],
    });
    expect(early.score).toBeGreaterThan(none.score);
    expect(early.reasons.join(" ")).toContain("72h");
  });

  it("does not double-count a sequence step in both ≤24h and 72h bands", () => {
    const result = buildContactUrgency({
      contactId: "c13",
      lastActivityAt: isoDaysAgo(1),
      taskDueAts: [],
      sequenceTaskDueAts: [isoHoursFromNow(12)],
      appointmentDates: [],
    });
    // Only the ≤24h band should fire
    expect(result.reasons.filter((r) => r.includes("72h")).length).toBe(0);
    expect(result.reasons.join(" ")).toContain("pending");
  });
});
