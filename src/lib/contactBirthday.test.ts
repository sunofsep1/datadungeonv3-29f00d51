import { describe, expect, it } from "vitest";
import { startOfDay } from "date-fns";
import { daysUntilNextBirthday, isBirthdayWithinDays } from "./contactBirthday";

describe("contactBirthday", () => {
  it("returns 0 when birthday is today", () => {
    const today = startOfDay(new Date());
    const dob = `${today.getFullYear() - 30}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(daysUntilNextBirthday(dob, today)).toBe(0);
    expect(isBirthdayWithinDays({ date_of_birth: dob }, 30, today)).toBe(true);
  });

  it("returns null for empty dob", () => {
    expect(daysUntilNextBirthday(null)).toBeNull();
    expect(daysUntilNextBirthday("")).toBeNull();
    expect(isBirthdayWithinDays({}, 30)).toBe(false);
  });

  it("counts days until next occurrence across year boundary", () => {
    const from = new Date("2026-06-15T12:00:00");
    const dob = "1990-12-20";
    const d = daysUntilNextBirthday(dob, from);
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(0);
    expect(d!).toBeLessThanOrEqual(365);
  });
});
