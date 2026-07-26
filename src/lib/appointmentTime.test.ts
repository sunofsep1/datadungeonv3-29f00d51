import { describe, expect, it } from "vitest";
import {
  appendEmailSignatureHtml,
  endTimeFromStart,
  toBrisbaneAllDayIso,
  toBrisbaneIso,
} from "./appointmentTime";

describe("toBrisbaneIso", () => {
  it("pins the time to Brisbane's +10:00 offset", () => {
    expect(toBrisbaneIso("2026-07-11", "13:00")).toBe("2026-07-11T13:00:00+10:00");
    expect(toBrisbaneIso("2026-07-08", "10:00")).toBe("2026-07-08T10:00:00+10:00");
  });

  it("round-trips to the correct UTC instant", () => {
    // The exact bug this fixes: 1pm Brisbane must store as 03:00Z, not 13:00Z.
    expect(new Date(toBrisbaneIso("2026-07-11", "13:00")).toISOString()).toBe(
      "2026-07-11T03:00:00.000Z",
    );
  });

  it("stays +10:00 through what would be daylight saving elsewhere", () => {
    // Queensland has no DST — a January booking uses the same offset as July.
    expect(toBrisbaneIso("2027-01-15", "09:00")).toBe("2027-01-15T09:00:00+10:00");
  });

  it("accepts a time that already carries seconds", () => {
    expect(toBrisbaneIso("2026-07-11", "13:00:00")).toBe("2026-07-11T13:00:00+10:00");
  });

  it("rejects malformed input rather than silently storing a bad instant", () => {
    expect(() => toBrisbaneIso("11/07/2026", "13:00")).toThrow(/Invalid date/);
    expect(() => toBrisbaneIso("2026-07-11", "1pm")).toThrow(/Invalid time/);
    expect(() => toBrisbaneIso("2026-07-11", "")).toThrow(/Invalid time/);
  });
});

describe("toBrisbaneAllDayIso", () => {
  it("anchors to midnight Brisbane, not midnight UTC", () => {
    expect(toBrisbaneAllDayIso("2026-07-11")).toBe("2026-07-11T00:00:00+10:00");
    expect(new Date(toBrisbaneAllDayIso("2026-07-11")).toISOString()).toBe(
      "2026-07-10T14:00:00.000Z",
    );
  });
});

describe("endTimeFromStart", () => {
  it("adds minutes within the same day", () => {
    expect(endTimeFromStart("09:00", 60)).toBe("10:00");
    expect(endTimeFromStart("09:30", 45)).toBe("10:15");
  });

  it("wraps at midnight", () => {
    expect(endTimeFromStart("23:30", 60)).toBe("00:30");
  });
});

describe("appendEmailSignatureHtml", () => {
  it("appends signature with line breaks", () => {
    expect(appendEmailSignatureHtml("<p>Hi</p>", "Cheers\nGreg")).toBe("<p>Hi</p><br><br>Cheers<br>Greg");
  });

  it("returns body only when signature empty", () => {
    expect(appendEmailSignatureHtml("<p>Hi</p>", "")).toBe("<p>Hi</p>");
  });
});
