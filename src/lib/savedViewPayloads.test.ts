import { describe, expect, it } from "vitest";
import {
  CONTACTS_SAVED_VIEW_V,
  TASKS_SAVED_VIEW_V,
  contactsPayloadToJson,
  parseContactsSavedViewPayload,
  parseTasksSavedViewPayload,
  tasksPayloadToJson,
} from "./savedViewPayloads";

describe("savedViewPayloads", () => {
  it("parses valid contacts v1 payload", () => {
    const raw = {
      v: CONTACTS_SAVED_VIEW_V,
      smart: "hot_lead",
      searchQuery: "foo",
      filterTagIds: ["a", "b"],
      filterSource: "referral",
      sortBy: "name-desc",
      filterHasProperty: true,
      filterLastTouched: "7days",
      filterLeadTemperature: "hot",
      filterTimeframeCategory: "all",
      filterRoleCategory: "all",
      filterContactClassification: "past_client",
      filterNoNextTouch: true,
      filterAutomationBlocked: false,
      filterBirthdaysUpcoming: false,
      filterAnnualReviewCandidates: true,
      filterIncludeClassIds: ["cls-1"],
      filterExcludeClassIds: [],
      filterClassIncludeMatch: "all",
      filterSubscriptionKind: "newsletters",
      filterSubscriptionMode: "not_subscribed",
      contactView: "grid",
      itemsPerPage: 50,
    };
    const p = parseContactsSavedViewPayload(raw);
    expect(p).not.toBeNull();
    expect(p!.smart).toBe("hot_lead");
    expect(p!.filterTagIds).toEqual(["a", "b"]);
    expect(p!.itemsPerPage).toBe(50);
    expect(p!.contactView).toBe("grid");
    expect(p!.filterIncludeClassIds).toEqual(["cls-1"]);
    expect(p!.filterSubscriptionMode).toBe("not_subscribed");
  });

  it("defaults class and subscription filters when omitted", () => {
    const p = parseContactsSavedViewPayload({
      v: CONTACTS_SAVED_VIEW_V,
      smart: null,
      searchQuery: "",
      filterTagIds: [],
      filterSource: "all",
      sortBy: "name-asc",
      filterHasProperty: null,
      filterLastTouched: "all",
      filterLeadTemperature: "all",
      filterTimeframeCategory: "all",
      filterRoleCategory: "all",
      filterContactClassification: "all",
      filterNoNextTouch: false,
      filterAutomationBlocked: false,
      filterBirthdaysUpcoming: false,
      filterAnnualReviewCandidates: false,
      contactView: "list",
      itemsPerPage: 25,
    });
    expect(p!.filterIncludeClassIds).toEqual([]);
    expect(p!.filterSubscriptionMode).toBe("any");
  });

  it("rejects wrong contacts version", () => {
    expect(parseContactsSavedViewPayload({ v: 2, searchQuery: "" })).toBeNull();
  });

  it("round-trips contacts v1 through json helpers", () => {
    const p = {
      v: CONTACTS_SAVED_VIEW_V,
      smart: null,
      searchQuery: "x",
      filterTagIds: [] as string[],
      filterSource: "all",
      sortBy: "name-asc",
      filterHasProperty: null,
      filterLastTouched: "all",
      filterLeadTemperature: "all",
      filterTimeframeCategory: "all",
      filterRoleCategory: "all",
      filterContactClassification: "all",
      filterNoNextTouch: false,
      filterAutomationBlocked: false,
      filterBirthdaysUpcoming: true,
      filterAnnualReviewCandidates: false,
      filterIncludeClassIds: [] as string[],
      filterExcludeClassIds: [] as string[],
      filterClassIncludeMatch: "any" as const,
      filterSubscriptionKind: "all",
      filterSubscriptionMode: "any" as const,
      contactView: "list" as const,
      itemsPerPage: 25,
    };
    const json = contactsPayloadToJson(p);
    const again = parseContactsSavedViewPayload(json);
    expect(again).not.toBeNull();
    expect(again!.searchQuery).toBe("x");
    expect(again!.filterBirthdaysUpcoming).toBe(true);
  });

  it("parses tasks v1 and round-trips json", () => {
    const p = { v: TASKS_SAVED_VIEW_V, mainTab: "todos" as const, appointmentsFilter: "today" as const };
    const j = tasksPayloadToJson(p);
    expect(j).toEqual(p);
    const parsed = parseTasksSavedViewPayload(p);
    expect(parsed).toEqual(p);
  });

  it("parses tasks appointments overdue and this_week filters", () => {
    const overdue = parseTasksSavedViewPayload({
      v: TASKS_SAVED_VIEW_V,
      mainTab: "appointments",
      appointmentsFilter: "overdue",
    });
    expect(overdue?.appointmentsFilter).toBe("overdue");
    const week = parseTasksSavedViewPayload({
      v: TASKS_SAVED_VIEW_V,
      mainTab: "appointments",
      appointmentsFilter: "this_week",
    });
    expect(week?.appointmentsFilter).toBe("this_week");
  });
});
