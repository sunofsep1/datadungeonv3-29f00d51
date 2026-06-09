import { describe, expect, it } from "vitest";
import { getCadenceDays } from "./followUpCadence";

describe("getCadenceDays", () => {
  it("uses hot cadence for hot status", () => {
    expect(getCadenceDays("hot")).toBe(7);
  });

  it("uses user default for generic lead temperature", () => {
    expect(getCadenceDays("lead", null, 21)).toBe(21);
  });

  it("prefers coming_to_market over default", () => {
    expect(getCadenceDays("lead", "otm", 21)).toBe(7);
  });
});
