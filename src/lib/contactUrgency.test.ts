import { afterEach, describe, expect, it, vi } from "vitest";
import { buildContactUrgency, tierFromScore } from "@/lib/contactUrgency";

function isoHoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
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
      lastActivityAt: new Date("2026-04-19T15:00:00.000Z").toISOString(),
      taskDueAts: [new Date("2026-04-25T09:00:00.000Z").toISOString()],
      sequenceTaskDueAts: [new Date("2026-04-25T03:00:00.000Z").toISOString()],
      appointmentDates: [new Date("2026-04-25T21:00:00.000Z").toISOString()],
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
});
