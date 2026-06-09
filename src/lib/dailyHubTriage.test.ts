import { describe, expect, it } from "vitest";
import {
  applyDragToColumnIds,
  assignmentsFromColumnIds,
  buildKanbanColumns,
  clearAssignment,
  columnIdForZone,
  pruneStaleAssignments,
  reconcileColumnIds,
  zoneFromColumnId,
} from "@/lib/dailyHubTriage";
import type { DailyHubScheduleRow } from "@/lib/dailyHubSchedule";

function row(id: string, bucket: DailyHubScheduleRow["bucket"] = "today"): DailyHubScheduleRow {
  return {
    id,
    kind: "contactTask",
    urgency: "priority",
    score: 10,
    title: id,
    detail: "Detail",
    whenText: "Start today",
    dueAt: new Date("2026-06-08T12:00:00"),
    canComplete: true,
    reason: "test",
    bucket,
  };
}

describe("dailyHubTriage", () => {
  it("maps column ids to zones", () => {
    expect(columnIdForZone("focus")).toBe("col-focus");
    expect(zoneFromColumnId("col-holding")).toBe("holding");
    expect(zoneFromColumnId("contact-task-1")).toBeNull();
  });

  it("builds schedule column for unassigned items", () => {
    const scheduleRows = [row("a", "overdue"), row("b", "today"), row("c", "coming_up")];
    const cols = buildKanbanColumns(scheduleRows, {});
    expect(cols.schedule.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(cols.focus).toHaveLength(0);
  });

  it("routes manually assigned items out of schedule", () => {
    const scheduleRows = [row("a"), row("b")];
    const cols = buildKanbanColumns(scheduleRows, {
      b: { zone: "holding", order: 0 },
    });
    expect(cols.schedule.map((r) => r.id)).toEqual(["a"]);
    expect(cols.holding.map((r) => r.id)).toEqual(["b"]);
  });

  it("prunes stale assignments", () => {
    const pruned = pruneStaleAssignments(
      { gone: { zone: "parked", order: 0 }, keep: { zone: "focus", order: 1 } },
      new Set(["keep"]),
    );
    expect(Object.keys(pruned)).toEqual(["keep"]);
  });

  it("clears assignment for return to schedule", () => {
    const next = clearAssignment({ x: { zone: "working", order: 0 } }, "x");
    expect(next).toEqual({});
  });

  it("moves item between columns on drag", () => {
    const columnIds = {
      schedule: ["a", "b"],
      focus: [],
      working: [],
      holding: [],
      parked: [],
    };
    const next = applyDragToColumnIds(columnIds, "b", columnIdForZone("holding"));
    expect(next?.schedule).toEqual(["a"]);
    expect(next?.holding).toEqual(["b"]);
  });

  it("reorders within the same column", () => {
    const columnIds = {
      schedule: [],
      focus: ["a", "b", "c"],
      working: [],
      holding: [],
      parked: [],
    };
    const next = applyDragToColumnIds(columnIds, "a", "c");
    expect(next?.focus).toEqual(["b", "c", "a"]);
  });

  it("reconciles column ids when schedule rows change", () => {
    const columnIds = {
      schedule: ["a"],
      focus: ["b"],
      working: [],
      holding: ["gone"],
      parked: [],
    };
    const next = reconcileColumnIds(columnIds, ["a", "b", "c"]);
    expect(next).toEqual({
      schedule: ["a", "c"],
      focus: ["b"],
      working: [],
      holding: [],
      parked: [],
    });
  });
});
