import { describe, it, expect } from "vitest";
import { cn, getInitials } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const showBlock = true;
    const showHidden = false;
    expect(cn("base", showHidden && "hidden", showBlock && "block")).toBe("base block");
  });
});

describe("getInitials", () => {
  it("uses first and last name when both provided", () => {
    expect(getInitials("John", "Doe")).toBe("JD");
  });

  it("uses first name only when last is missing", () => {
    expect(getInitials("John", null)).toBe("JO");
  });

  it("uses fallback name when no first/last", () => {
    expect(getInitials(null, null, "Jane Doe")).toBe("JD");
  });

  it("uses first two chars of single word fallback", () => {
    expect(getInitials(null, null, "Bob")).toBe("BO");
  });

  it("returns ? when no name data", () => {
    expect(getInitials(null, null, "")).toBe("?");
  });
});
