import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDailyHubItems,
  dailyHubPriorityItems,
  partitionDailyHubItems,
} from "@/lib/dailyHubSchedule";

const TODAY_NOON = new Date("2026-06-08T12:00:00");
const TODAY_NOON_MS = TODAY_NOON.getTime();

// The scheduler classifies "today"/"overdue"/"coming up" against the real clock, so pin
// the clock to the reference date to keep these date-based buckets deterministic in CI.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY_NOON);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildDailyHubItems", () => {
  it("puts a contact task starting today in the today bucket", () => {
    const items = buildDailyHubItems({
      openContactTasks: [
        {
          id: "t1",
          contact_id: "c1",
          title: "Prep appt for Chau",
          due_at: "2026-06-08T12:00:00.000Z",
          sequence_enrollment_id: null,
        },
      ],
      todos: [],
      appointments: [],
      contacts: [],
      contactNameById: new Map([["c1", "Chau"]]),
      urgencyByContactId: new Map([
        [
          "c1",
          {
            contactId: "c1",
            score: 10,
            tier: "backlog",
            reasons: ["manually set to backlog"],
          },
        ],
      ]),
      now: TODAY_NOON_MS,
    });

    expect(items).toHaveLength(1);
    expect(items[0].whenText).toContain("Start today");
    expect(items[0].urgency).not.toBe("backlog");

    const { todayItems } = partitionDailyHubItems(items, TODAY_NOON_MS);
    expect(todayItems).toHaveLength(1);
    expect(dailyHubPriorityItems(items, TODAY_NOON_MS)[0].id).toBe("contact-task-t1");
  });

  it("puts future start dates in coming up", () => {
    const items = buildDailyHubItems({
      openContactTasks: [
        {
          id: "t-week",
          contact_id: "c1",
          title: "Prep brief",
          due_at: "2026-06-11T12:00:00.000Z",
          sequence_enrollment_id: null,
        },
      ],
      todos: [],
      appointments: [],
      contacts: [],
      contactNameById: new Map([["c1", "Chau"]]),
      urgencyByContactId: new Map(),
      now: TODAY_NOON_MS,
    });
    const { comingUpItems } = partitionDailyHubItems(items, TODAY_NOON_MS);
    expect(comingUpItems).toHaveLength(1);
    expect(comingUpItems[0].whenText).toContain("Start");
  });

  it("includes tasks with no start date in coming up", () => {
    const items = buildDailyHubItems({
      openContactTasks: [
        {
          id: "t-open",
          contact_id: "c1",
          title: "Follow up",
          due_at: null,
          sequence_enrollment_id: null,
        },
      ],
      todos: [],
      appointments: [],
      contacts: [],
      contactNameById: new Map([["c1", "Chau"]]),
      urgencyByContactId: new Map(),
      now: TODAY_NOON_MS,
    });
    const { comingUpItems } = partitionDailyHubItems(items, TODAY_NOON_MS);
    expect(comingUpItems).toHaveLength(1);
  });
});
