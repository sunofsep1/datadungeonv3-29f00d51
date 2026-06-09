import { describe, expect, it } from "vitest";
import { filterSettingsSearch, filterSettingsNavPaths } from "./settingsSearchIndex";

describe("filterSettingsSearch", () => {
  it("finds commission by keyword", () => {
    const results = filterSettingsSearch("commission");
    expect(results.some((r) => r.label === "Commission rate")).toBe(true);
    expect(results.some((r) => r.path === "/settings/business")).toBe(true);
  });

  it("finds 2fa by alias", () => {
    const results = filterSettingsSearch("2fa");
    expect(results.some((r) => r.label === "Two-factor authentication")).toBe(true);
  });

  it("returns empty for blank query", () => {
    expect(filterSettingsSearch("")).toEqual([]);
  });
});

describe("filterSettingsNavPaths", () => {
  it("returns null when query empty", () => {
    expect(filterSettingsNavPaths("")).toBeNull();
  });

  it("returns matching section paths", () => {
    const paths = filterSettingsNavPaths("sms");
    expect(paths?.has("/settings/communications")).toBe(true);
  });
});
