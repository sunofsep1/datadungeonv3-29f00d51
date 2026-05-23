import { describe, expect, it } from "vitest";
import { addDaysToIso, scheduleProgress } from "./activitySchedule";

describe("activitySchedule", () => {
  it("addDaysToIso offsets from base date", () => {
    const base = new Date("2026-05-18T10:00:00.000Z");
    const due = addDaysToIso(base, 7);
    expect(due.slice(0, 10)).toBe("2026-05-25");
  });

  it("scheduleProgress rounds percent complete", () => {
    expect(scheduleProgress(2, 5)).toBe(40);
    expect(scheduleProgress(0, 0)).toBe(0);
    expect(scheduleProgress(3, 3)).toBe(100);
  });
});
