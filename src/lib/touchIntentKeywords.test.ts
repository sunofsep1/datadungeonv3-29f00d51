import { describe, expect, it } from "vitest";
import { touchTextSignalsMatch } from "@/lib/touchIntentKeywords";

describe("touchTextSignalsMatch", () => {
  it("matches appraisal and appointment keywords", () => {
    expect(touchTextSignalsMatch("Booked appt for appraisal Thursday")).toBe(true);
    expect(touchTextSignalsMatch("Market evaluation scheduled")).toBe(true);
    expect(touchTextSignalsMatch("Follow-up call")).toBe(false);
  });

  it("ignores empty notes", () => {
    expect(touchTextSignalsMatch("")).toBe(false);
    expect(touchTextSignalsMatch(null)).toBe(false);
  });
});
