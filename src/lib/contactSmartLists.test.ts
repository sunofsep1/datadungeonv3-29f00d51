import { describe, it, expect } from "vitest";
import {
  CONTACT_SMART_LISTS,
  parseSmartListParam,
  isClassificationSmartList,
  type ContactSmartListId,
} from "./contactSmartLists";

describe("parseSmartListParam", () => {
  it("returns null for empty or unknown values", () => {
    expect(parseSmartListParam(null)).toBeNull();
    expect(parseSmartListParam("")).toBeNull();
    expect(parseSmartListParam("nope")).toBeNull();
  });

  it("maps classification and saved-view ids", () => {
    expect(parseSmartListParam("hot_lead")).toBe("hot_lead");
    expect(parseSmartListParam("top_100")).toBe("top_100");
    expect(parseSmartListParam("stale")).toBe("stale");
    expect(parseSmartListParam("no_next_touch")).toBe("no_next_touch");
    expect(parseSmartListParam("automation_blocked")).toBe("automation_blocked");
  });

  it("treats all as explicit", () => {
    expect(parseSmartListParam("all")).toBe("all");
  });
});

describe("isClassificationSmartList", () => {
  it("is true only for contact_category-backed chips", () => {
    const classification: ContactSmartListId[] = [
      "top_100",
      "past_client",
      "referral_partner",
      "hot_lead",
      "warm_lead",
      "seller_nurture",
    ];
    for (const id of classification) {
      expect(isClassificationSmartList(id)).toBe(true);
    }
  });

  it("is false for all and saved-view filters", () => {
    expect(isClassificationSmartList("all")).toBe(false);
    expect(isClassificationSmartList("stale")).toBe(false);
    expect(isClassificationSmartList("no_next_touch")).toBe(false);
    expect(isClassificationSmartList("automation_blocked")).toBe(false);
  });
});

describe("CONTACT_SMART_LISTS", () => {
  it("has unique ids matching parseSmartListParam", () => {
    const ids = CONTACT_SMART_LISTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { id } of CONTACT_SMART_LISTS) {
      if (id === "all") expect(parseSmartListParam("all")).toBe("all");
      else expect(parseSmartListParam(id)).toBe(id);
    }
  });
});
