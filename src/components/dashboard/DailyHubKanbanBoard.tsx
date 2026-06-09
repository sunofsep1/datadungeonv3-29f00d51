import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { DailyHubKanbanColumn } from "@/components/dashboard/DailyHubKanbanColumn";
import { DailyHubQueueCard } from "@/components/dashboard/DailyHubQueueCard";
import type { DailyHubItem, DailyHubScheduleRow } from "@/lib/dailyHubSchedule";
import {
  applyDragToColumnIds,
  assignmentsFromColumnIds,
  buildKanbanColumns,
  columnIdsFromColumns,
  columnsFromIds,
  DAILY_HUB_KANBAN_COLUMN_WIDTH,
  DAILY_HUB_TRIAGE_ZONES,
  findZoneForDndId,
  findZoneForItemId,
  loadDailyHubTriage,
  pruneStaleAssignments,
  saveDailyHubTriage,
  zoneFromColumnId,
  type DailyHubTriageZone,
} from "@/lib/dailyHubTriage";
import { cn } from "@/lib/utils";

type Props = {
  scheduleRows: DailyHubScheduleRow[];
  userId: string | undefined;
  completingId: string | null;
  onOpen: (item: DailyHubItem, zone: DailyHubTriageZone) => void;
  onComplete: (item: DailyHubItem) => void;
};

function rowsById(rows: DailyHubScheduleRow[]): Map<string, DailyHubScheduleRow> {
  return new Map(rows.map((row) => [row.id, row]));
}

function persistTriage(
  userId: string | undefined,
  columnIds: Record<DailyHubTriageZone, string[]>,
): Record<string, import("@/lib/dailyHubTriage").DailyHubTriageAssignment> {
  const nextAssignments = assignmentsFromColumnIds(columnIds);
  saveDailyHubTriage(userId, { v: 1, assignments: nextAssignments });
  console.log("[DailyHub] SAVE userId=", userId, "assignments=", JSON.stringify(nextAssignments));
  return nextAssignments;
}

/** Prefer card hit targets for reorder; fall back to column drop zones. */
const kanbanCollisionDetection: CollisionDetection = (args) => {
  const sortableContainers = args.droppableContainers.filter(
    (container) => !zoneFromColumnId(String(container.id)),
  );
  const sortableHits = pointerWithin({
    ...args,
    droppableContainers: sortableContainers,
  });
  if (sortableHits.length > 0) return sortableHits;

  const columnContainers = args.droppableContainers.filter((container) =>
    zoneFromColumnId(String(container.id)),
  );
  const columnHits = pointerWithin({
    ...args,
    droppableContainers: columnContainers,
  });
  if (columnHits.length > 0) return columnHits;

  return rectIntersection(args);
};

function columnIdsEqual(
  a: Record<DailyHubTriageZone, string[]>,
  b: Record<DailyHubTriageZone, string[]>,
): boolean {
  for (const zone of DAILY_HUB_TRIAGE_ZONES) {
    if (a[zone].length !== b[zone].length) return false;
    for (let i = 0; i < a[zone].length; i++) {
      if (a[zone][i] !== b[zone][i]) return false;
    }
  }
  return true;
}

export function DailyHubKanbanBoard({
  scheduleRows,
  userId,
  completingId,
  onOpen,
  onComplete,
}: Props) {
  const rowMap = useMemo(() => rowsById(scheduleRows), [scheduleRows]);
  const scheduleRowIds = useMemo(() => scheduleRows.map((row) => row.id), [scheduleRows]);
  const scheduleRowIdsKey = scheduleRowIds.join("|");

  const [assignments, setAssignments] = useState(() => loadDailyHubTriage(userId).assignments);
  const [columnIds, setColumnIds] = useState(() =>
    columnIdsFromColumns(buildKanbanColumns(scheduleRows, loadDailyHubTriage(userId).assignments)),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const columnIdsRef = useRef(columnIds);
  columnIdsRef.current = columnIds;

  useEffect(() => {
    // Load the saved triage state fresh from localStorage on every trigger.
    // Loading directly (not from React state/refs) is necessary because this effect
    // can fire in the same flush as the userId effect — at that moment React state
    // hasn't committed the userId effect's setAssignments yet, so any ref or state
    // variable would carry the pre-auth-resolve value and wipe the saved layout.
    //
    // Guard: when validIds is empty (scheduleRows not yet loaded), skip pruning.
    // pruneStaleAssignments against an empty set would delete every saved assignment
    // and write that back to localStorage, permanently destroying the saved triage.
    const loaded = loadDailyHubTriage(userId);
    const validIds = new Set(scheduleRowIds);
    console.log("[DailyHub] RECONCILE userId=", userId, "validIds.size=", validIds.size, "loaded=", JSON.stringify(loaded.assignments));

    if (validIds.size === 0) {
      // Data hasn't arrived yet — restore assignments so they are ready for the
      // next fire (when data loads and validIds becomes non-empty), but don't prune.
      setAssignments(loaded.assignments);
      setColumnIds(columnIdsFromColumns(buildKanbanColumns(scheduleRows, loaded.assignments)));
      return;
    }

    const pruned = pruneStaleAssignments(loaded.assignments, validIds);
    console.log("[DailyHub] RECONCILE pruned=", JSON.stringify(pruned), "scheduleRowIds=", scheduleRowIds.slice(0,5));
    if (Object.keys(pruned).length !== Object.keys(loaded.assignments).length) {
      saveDailyHubTriage(userId, { v: 1, assignments: pruned });
    }
    setAssignments(pruned);
    setColumnIds(columnIdsFromColumns(buildKanbanColumns(scheduleRows, pruned)));
  }, [scheduleRowIdsKey, userId]); // eslint-disable-line react-hooks/exhaustive-deps -- scheduleRowIds/scheduleRows read via closure; scheduleRowIdsKey (string) is the meaningful change signal

  const displayColumns = useMemo(
    () => columnsFromIds(columnIds, rowMap),
    [columnIds, rowMap],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commitColumnIds = useCallback(
    (nextColumnIds: Record<DailyHubTriageZone, string[]>) => {
      setColumnIds(nextColumnIds);
      setAssignments(persistTriage(userId, nextColumnIds));
    },
    [userId],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    const loaded = loadDailyHubTriage(userId);
    setAssignments(loaded.assignments);
    setColumnIds(columnIdsFromColumns(buildKanbanColumns(scheduleRows, loaded.assignments)));
  }, [userId, scheduleRows]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);
    if (activeItemId === overId) return;

    setColumnIds((prev) => {
      const fromZone = findZoneForItemId(activeItemId, prev);
      const toZone = findZoneForDndId(overId, prev);
      if (!fromZone || !toZone) return prev;
      const next = applyDragToColumnIds(prev, activeItemId, overId);
      if (!next || columnIdsEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      // Read the current columnIds synchronously via ref. By the time onDragEnd fires
      // (a separate pointer-event from onDragOver), React has already committed all
      // handleDragOver state updates, so the ref is guaranteed to be up-to-date.
      const current = columnIdsRef.current;
      let next = current;
      if (over) {
        const activeItemId = String(active.id);
        const overId = String(over.id);
        if (activeItemId !== overId) {
          next = applyDragToColumnIds(current, activeItemId, overId) ?? current;
        }
      }
      console.log("[DailyHub] DRAG END userId=", userId, "focus=", next.focus, "working=", next.working, "holding=", next.holding, "parked=", next.parked);
      // Call setColumnIds and persistTriage as plain top-level calls (not inside a
      // state-updater). Keeping side-effects out of updaters avoids double-invocation
      // in React Strict Mode and unexpected interactions in concurrent rendering.
      setColumnIds(next);
      setAssignments(persistTriage(userId, next));
    },
    [userId],
  );

  const handleReturnToSchedule = useCallback(
    (itemId: string) => {
      const prev = columnIdsRef.current;
      const fromZone = findZoneForItemId(itemId, prev);
      if (!fromZone || fromZone === "schedule") return;

      const next: Record<DailyHubTriageZone, string[]> = {
        schedule: [...prev.schedule, itemId],
        focus: prev.focus.filter((id) => id !== itemId),
        working: prev.working.filter((id) => id !== itemId),
        holding: prev.holding.filter((id) => id !== itemId),
        parked: prev.parked.filter((id) => id !== itemId),
      };
      commitColumnIds(next);
    },
    [commitColumnIds],
  );

  const activeRow = activeId ? rowMap.get(activeId) : undefined;
  const activeZone = activeRow
    ? DAILY_HUB_TRIAGE_ZONES.find((zone) => columnIds[zone].includes(activeRow.id)) ?? "schedule"
    : "schedule";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-0 [&::-webkit-scrollbar]:hidden">
        {DAILY_HUB_TRIAGE_ZONES.map((zone) => (
          <DailyHubKanbanColumn
            key={zone}
            zone={zone}
            items={displayColumns[zone]}
            completingId={completingId}
            onOpen={onOpen}
            onComplete={onComplete}
            onReturnToSchedule={handleReturnToSchedule}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
        {activeRow ? (
          <div
            className={cn(
              "flex items-start gap-1.5 rounded-2xl border-2 border-primary bg-card p-1.5 shadow-xl shadow-primary/10",
              DAILY_HUB_KANBAN_COLUMN_WIDTH,
            )}
          >
            <GripVertical className="mt-3.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <DailyHubQueueCard
              item={activeRow}
              zone={activeZone}
              completing={false}
              onOpen={() => undefined}
              onComplete={() => undefined}
              className="pointer-events-none min-w-0 flex-1"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
