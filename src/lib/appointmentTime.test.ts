import { describe, expect, it } from "vitest";
import { appendEmailSignatureHtml, endTimeFromStart } from "./appointmentTime";

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
