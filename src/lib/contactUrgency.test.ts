import { describe, expect, it } from "vitest";
import { buildContactUrgency, tierFromScore } from "@/lib/contactUrgency";

function isoHoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

describe("contact urgency tiers", () => {
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
    const result = buildContactUrgency({
      contactId: "c2",
      lastActivityAt: isoHoursFromNow(-24 * 5),
      taskDueAts: [isoHoursFromNow(18)],
      sequenceTaskDueAts: [isoHoursFromNow(12)],
      appointmentDates: [isoHoursFromNow(30)],
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
