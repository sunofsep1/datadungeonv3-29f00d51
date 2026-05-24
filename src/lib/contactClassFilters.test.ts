import { describe, expect, it } from "vitest";
import {
  contactPassesClassFilter,
  contactPassesSubscriptionFilter,
} from "@/lib/contactClassFilters";

describe("contactClassFilters", () => {
  const index = new Map<string, Set<string>>([
    ["c1", new Set(["a", "b"])],
    ["c2", new Set(["b"])],
  ]);

  it("includes any class", () => {
    expect(
      contactPassesClassFilter(
        "c1",
        { includeClassIds: ["a"], excludeClassIds: [], includeMatch: "any" },
        index,
      ),
    ).toBe(true);
    expect(
      contactPassesClassFilter(
        "c2",
        { includeClassIds: ["a"], excludeClassIds: [], includeMatch: "any" },
        index,
      ),
    ).toBe(false);
  });

  it("includes all classes", () => {
    expect(
      contactPassesClassFilter(
        "c1",
        { includeClassIds: ["a", "b"], excludeClassIds: [], includeMatch: "all" },
        index,
      ),
    ).toBe(true);
    expect(
      contactPassesClassFilter(
        "c2",
        { includeClassIds: ["a", "b"], excludeClassIds: [], includeMatch: "all" },
        index,
      ),
    ).toBe(false);
  });

  it("excludes class", () => {
    expect(
      contactPassesClassFilter(
        "c2",
        { includeClassIds: [], excludeClassIds: ["b"], includeMatch: "any" },
        index,
      ),
    ).toBe(false);
  });

  it("filters subscription", () => {
    const subs = new Map([
      ["c1", new Map([["newsletters", true]] as const)],
    ] as [string, Map<"newsletters", boolean>][]);
    expect(
      contactPassesSubscriptionFilter(
        "c1",
        { kind: "newsletters", mode: "subscribed" },
        subs as Map<string, Map<"newsletters", boolean>>,
      ),
    ).toBe(true);
    expect(
      contactPassesSubscriptionFilter(
        "c2",
        { kind: "newsletters", mode: "subscribed" },
        subs as Map<string, Map<"newsletters", boolean>>,
      ),
    ).toBe(false);
  });
});
