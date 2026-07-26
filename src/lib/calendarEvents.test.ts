import { describe, expect, it } from "vitest";
import {
  clashingIds,
  dayLoad,
  findClashes,
  findGaps,
  itemSpan,
  layoutDay,
  metaFor,
  type CalendarItem,
} from "./calendarEvents";

const DAY = new Date(2026, 6, 28); // Tue 28 July 2026, local

/** Hours may be fractional (10.5 === 10:30); Date would truncate, so convert to minutes. */
function at(hour: number) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return new Date(2026, 6, 28, h, m, 0, 0);
}

function ev(id: string, startHour: number, endHour?: number, extra: Partial<CalendarItem> = {}): CalendarItem {
  const start = at(startHour);
  const end = endHour === undefined ? null : at(endHour).toISOString();
  return {
    id,
    title: id,
    date: start.toISOString(),
    end,
    source: "app",
    type: "meeting",
    ...extra,
  };
}

describe("itemSpan", () => {
  it("uses the stored end when present", () => {
    const { start, end } = itemSpan(ev("a", 10, 11.5), 60);
    expect((end - start) / 60000).toBe(90);
  });

  it("falls back to the default duration when end is missing", () => {
    const { start, end } = itemSpan(ev("a", 9), 90);
    expect((end - start) / 60000).toBe(90);
  });

  it("falls back when the stored end is not after the start", () => {
    const broken = { ...ev("a", 9), end: new Date(2026, 6, 28, 8, 0).toISOString() };
    const { start, end } = itemSpan(broken, 60);
    expect((end - start) / 60000).toBe(60);
  });
});

describe("findClashes", () => {
  it("catches the 9am block running under the 10am block", () => {
    // Greg's real double-booking: recurring "25 calls" 9:00-11:30 vs Daily 5 10:00-11:30.
    const calls = ev("25 calls", 9, 11);
    const daily5 = ev("daily 5", 10, 11);
    const pairs = findClashes([calls, daily5]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].map((p) => p.id).sort()).toEqual(["25 calls", "daily 5"]);
  });

  it("does not flag back-to-back appointments", () => {
    expect(findClashes([ev("a", 9, 10), ev("b", 10, 11)])).toHaveLength(0);
  });

  it("ignores all-day entries", () => {
    const goal = { ...ev("goal", 0), allDay: true };
    expect(findClashes([goal, ev("a", 9, 10)])).toHaveLength(0);
  });

  it("reports every clashing id", () => {
    const ids = clashingIds([ev("a", 9, 12), ev("b", 10, 11), ev("c", 15, 16)]);
    expect([...ids].sort()).toEqual(["a", "b"]);
  });
});

describe("findGaps", () => {
  it("finds the free window between two appointments", () => {
    const gaps = findGaps([ev("a", 9, 10), ev("b", 14, 15)], DAY, { minGapMinutes: 60 });
    // 07:00-09:00, 10:00-14:00, 15:00-18:00
    expect(gaps.map((g) => [g.startMinutes / 60, g.endMinutes / 60])).toEqual([
      [7, 9],
      [10, 14],
      [15, 18],
    ]);
  });

  it("does not invent a gap between overlapping bookings", () => {
    const gaps = findGaps([ev("a", 9, 11), ev("b", 10, 12)], DAY, { minGapMinutes: 60 });
    expect(gaps.map((g) => [g.startMinutes / 60, g.endMinutes / 60])).toEqual([
      [7, 9],
      [12, 18],
    ]);
  });

  it("ignores windows shorter than the minimum", () => {
    // The 10:00-10:30 sliver between these two is real but too small to sell.
    const gaps = findGaps([ev("a", 9, 10), ev("b", 10.5, 12)], DAY, { minGapMinutes: 45 });
    expect(gaps.map((g) => [g.startMinutes / 60, g.endMinutes / 60])).toEqual([
      [7, 9],
      [12, 18],
    ]);
  });

  it("returns the whole working day when nothing is booked", () => {
    const gaps = findGaps([], DAY, { minGapMinutes: 45 });
    expect(gaps).toHaveLength(1);
    expect(gaps[0].minutes).toBe(11 * 60);
  });
});

describe("layoutDay", () => {
  it("puts overlapping blocks in separate lanes", () => {
    const placed = layoutDay([ev("a", 9, 11), ev("b", 10, 11)], DAY);
    expect(placed).toHaveLength(2);
    expect(placed.map((p) => p.lane)).toEqual([0, 1]);
    // Both must agree on the lane count so their widths match.
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
  });

  it("keeps sequential blocks in a single lane", () => {
    const placed = layoutDay([ev("a", 9, 10), ev("b", 11, 12)], DAY);
    expect(placed.every((p) => p.lanes === 1)).toBe(true);
  });

  it("positions a block proportionally in the 7am-6pm window", () => {
    const [block] = layoutDay([ev("a", 9, 10)], DAY);
    expect(block.top).toBeCloseTo(2 / 11, 5);
    expect(block.height).toBeCloseTo(1 / 11, 5);
  });

  it("clips a booking that runs past the end of the rail", () => {
    const [block] = layoutDay([ev("a", 17, 22)], DAY);
    expect(block.top + block.height).toBeLessThanOrEqual(1.0001);
  });

  it("drops anything entirely outside the window", () => {
    expect(layoutDay([ev("a", 3, 4)], DAY)).toHaveLength(0);
  });
});

describe("metaFor", () => {
  it("colours by appointment type", () => {
    expect(metaFor({ source: "app", type: "prospecting" }).label).toBe("Prospecting");
  });

  it("falls back to meeting for an unknown type", () => {
    expect(metaFor({ source: "app", type: "nonsense" }).label).toBe("Meeting");
  });

  it("gives Google events their own neutral treatment", () => {
    expect(metaFor({ source: "google", type: "prospecting" }).label).toBe("Google");
  });
});

describe("dayLoad", () => {
  it("scales with the number of timed commitments", () => {
    expect(dayLoad([])).toBe(0);
    expect(dayLoad([ev("a", 9)])).toBe(1);
    expect(dayLoad([ev("a", 9), ev("b", 11)])).toBe(2);
    expect(dayLoad([ev("a", 9), ev("b", 11), ev("c", 13), ev("d", 15)])).toBe(3);
  });

  it("does not count all-day entries as load", () => {
    expect(dayLoad([{ ...ev("goal", 0), allDay: true }])).toBe(0);
  });
});
