import type { DailyHubScheduleRow } from "@/lib/dailyHubSchedule";
import { arrayMove } from "@dnd-kit/sortable";

export const DAILY_HUB_TRIAGE_V = 1 as const;

export type DailyHubTriageZone = "schedule" | "focus" | "working" | "holding" | "parked";

export const DAILY_HUB_TRIAGE_ZONES: DailyHubTriageZone[] = [
  "schedule",
  "focus",
  "working",
  "holding",
  "parked",
];

export type DailyHubTriageAssignment = {
  zone: Exclude<DailyHubTriageZone, "schedule">;
  order: number;
};

export type DailyHubTriageState = {
  v: typeof DAILY_HUB_TRIAGE_V;
  assignments: Record<string, DailyHubTriageAssignment>;
};

export type DailyHubKanbanColumns = Record<DailyHubTriageZone, DailyHubScheduleRow[]>;

export const DAILY_HUB_ZONE_META: Record<
  DailyHubTriageZone,
  { label: string; subtitle: string }
> = {
  schedule: { label: "Schedule", subtitle: "Auto-sorted by due date" },
  focus: { label: "Focus Room", subtitle: "Deep work — opens Work session" },
  working: { label: "Working On", subtitle: "Doing today" },
  holding: { label: "Holding Bay", subtitle: "On your radar, not finishing now" },
  parked: { label: "Parked", subtitle: "Set aside for later" },
};

/** Shared kanban column width — used by columns + drag overlay. */
export const DAILY_HUB_KANBAN_COLUMN_WIDTH =
  "w-[min(94vw,340px)] shrink-0 basis-[min(94vw,340px)] sm:w-[360px] sm:basis-[360px] lg:w-[380px] lg:basis-[380px]";

export const DAILY_HUB_ZONE_STYLE: Record<
  DailyHubTriageZone,
  { dotClass: string; headerClass: string; shellClass: string }
> = {
  schedule: {
    dotClass: "bg-sky-400",
    headerClass: "bg-gradient-to-r from-sky-500/14 via-sky-500/6 to-transparent",
    shellClass: "border-border/70 bg-card/55 shadow-sm",
  },
  focus: {
    dotClass: "bg-primary shadow-[0_0_10px_rgba(0,188,212,0.45)]",
    headerClass: "bg-gradient-to-r from-primary/22 via-primary/10 to-transparent",
    shellClass: "border-primary/35 bg-primary/[0.06] shadow-md shadow-primary/10",
  },
  working: {
    dotClass: "bg-amber-400",
    headerClass: "bg-gradient-to-r from-amber-500/16 via-amber-500/6 to-transparent",
    shellClass: "border-amber-400/30 bg-amber-500/[0.04] shadow-sm",
  },
  holding: {
    dotClass: "bg-violet-400",
    headerClass: "bg-gradient-to-r from-violet-500/14 via-violet-500/5 to-transparent",
    shellClass: "border-dashed border-violet-400/35 bg-violet-500/[0.03] shadow-sm",
  },
  parked: {
    dotClass: "bg-muted-foreground/55",
    headerClass: "bg-gradient-to-r from-muted/50 via-muted/20 to-transparent",
    shellClass: "border-border/65 bg-muted/15 shadow-sm",
  },
};

const STORAGE_KEY_PREFIX = "datadungeon_daily_hub_triage_v1";

export function storageKeyForDailyHubTriage(userId: string | undefined): string {
  return userId ? `${STORAGE_KEY_PREFIX}:user:${userId}` : STORAGE_KEY_PREFIX;
}

export function columnIdForZone(zone: DailyHubTriageZone): string {
  return `col-${zone}`;
}

export function zoneFromColumnId(columnId: string): DailyHubTriageZone | null {
  if (!columnId.startsWith("col-")) return null;
  const zone = columnId.slice(4) as DailyHubTriageZone;
  return DAILY_HUB_TRIAGE_ZONES.includes(zone) ? zone : null;
}

export function resolveItemZone(
  itemId: string,
  assignments: Record<string, DailyHubTriageAssignment>,
): DailyHubTriageZone {
  const assign = assignments[itemId];
  return assign?.zone ?? "schedule";
}

export function pruneStaleAssignments(
  assignments: Record<string, DailyHubTriageAssignment>,
  validItemIds: Set<string>,
): Record<string, DailyHubTriageAssignment> {
  const next: Record<string, DailyHubTriageAssignment> = {};
  for (const [id, assign] of Object.entries(assignments)) {
    if (validItemIds.has(id)) next[id] = assign;
  }
  return next;
}

export function clearAssignment(
  assignments: Record<string, DailyHubTriageAssignment>,
  itemId: string,
): Record<string, DailyHubTriageAssignment> {
  const next = { ...assignments };
  delete next[itemId];
  return next;
}

export function buildKanbanColumns(
  scheduleRows: DailyHubScheduleRow[],
  assignments: Record<string, DailyHubTriageAssignment>,
): DailyHubKanbanColumns {
  const cols: DailyHubKanbanColumns = {
    schedule: [],
    focus: [],
    working: [],
    holding: [],
    parked: [],
  };

  const manual: Record<Exclude<DailyHubTriageZone, "schedule">, DailyHubScheduleRow[]> = {
    focus: [],
    working: [],
    holding: [],
    parked: [],
  };

  for (const row of scheduleRows) {
    const assign = assignments[row.id];
    if (assign) {
      manual[assign.zone].push(row);
    } else {
      cols.schedule.push(row);
    }
  }

  for (const zone of ["focus", "working", "holding", "parked"] as const) {
    manual[zone].sort((a, b) => (assignments[a.id]?.order ?? 0) - (assignments[b.id]?.order ?? 0));
    cols[zone] = manual[zone];
  }

  return cols;
}

export function columnIdsFromColumns(columns: DailyHubKanbanColumns): Record<DailyHubTriageZone, string[]> {
  return {
    schedule: columns.schedule.map((r) => r.id),
    focus: columns.focus.map((r) => r.id),
    working: columns.working.map((r) => r.id),
    holding: columns.holding.map((r) => r.id),
    parked: columns.parked.map((r) => r.id),
  };
}

export function columnsFromIds(
  columnIds: Record<DailyHubTriageZone, string[]>,
  rowById: Map<string, DailyHubScheduleRow>,
): DailyHubKanbanColumns {
  const cols = {} as DailyHubKanbanColumns;
  for (const zone of DAILY_HUB_TRIAGE_ZONES) {
    cols[zone] = columnIds[zone]
      .map((id) => rowById.get(id))
      .filter((row): row is DailyHubScheduleRow => Boolean(row));
  }
  return cols;
}

export function assignmentsFromColumnIds(
  columnIds: Record<DailyHubTriageZone, string[]>,
): Record<string, DailyHubTriageAssignment> {
  const next: Record<string, DailyHubTriageAssignment> = {};
  for (const zone of ["focus", "working", "holding", "parked"] as const) {
    columnIds[zone].forEach((id, index) => {
      next[id] = { zone, order: index };
    });
  }
  return next;
}

export function findZoneForItemId(
  itemId: string,
  columnIds: Record<DailyHubTriageZone, string[]>,
): DailyHubTriageZone | null {
  for (const zone of DAILY_HUB_TRIAGE_ZONES) {
    if (columnIds[zone].includes(itemId)) return zone;
  }
  return null;
}

export function findZoneForDndId(
  id: string,
  columnIds: Record<DailyHubTriageZone, string[]>,
): DailyHubTriageZone | null {
  const fromColumn = zoneFromColumnId(id);
  if (fromColumn) return fromColumn;
  return findZoneForItemId(id, columnIds);
}

/** Move/reorder item across kanban columns (pure). */
export function applyDragToColumnIds(
  columnIds: Record<DailyHubTriageZone, string[]>,
  activeId: string,
  overId: string,
): Record<DailyHubTriageZone, string[]> | null {
  const activeZone = findZoneForItemId(activeId, columnIds);
  const overZone = findZoneForDndId(overId, columnIds);
  if (!activeZone || !overZone) return null;

  const next: Record<DailyHubTriageZone, string[]> = {
    schedule: [...columnIds.schedule],
    focus: [...columnIds.focus],
    working: [...columnIds.working],
    holding: [...columnIds.holding],
    parked: [...columnIds.parked],
  };

  if (activeZone === overZone) {
    const items = next[activeZone];
    const oldIndex = items.indexOf(activeId);
    if (oldIndex === -1) return null;
    let newIndex = items.indexOf(overId);
    if (newIndex === -1) newIndex = items.length - 1;
    if (oldIndex === newIndex) return null;
    next[activeZone] = arrayMove(items, oldIndex, newIndex);
    return next;
  }

  const fromItems = next[activeZone];
  const activeIndex = fromItems.indexOf(activeId);
  if (activeIndex === -1) return null;
  fromItems.splice(activeIndex, 1);

  const toItems = next[overZone];
  let overIndex = toItems.indexOf(overId);
  if (overIndex === -1) overIndex = toItems.length;
  toItems.splice(overIndex, 0, activeId);

  return next;
}

/** Drop removed items and append new schedule rows without resetting manual column layout. */
export function reconcileColumnIds(
  columnIds: Record<DailyHubTriageZone, string[]>,
  scheduleRowIds: string[],
): Record<DailyHubTriageZone, string[]> {
  const validIds = new Set(scheduleRowIds);
  const next: Record<DailyHubTriageZone, string[]> = {
    schedule: [],
    focus: [],
    working: [],
    holding: [],
    parked: [],
  };
  const placed = new Set<string>();

  for (const zone of DAILY_HUB_TRIAGE_ZONES) {
    for (const id of columnIds[zone]) {
      if (!validIds.has(id)) continue;
      next[zone].push(id);
      placed.add(id);
    }
  }

  for (const id of scheduleRowIds) {
    if (!placed.has(id)) next.schedule.push(id);
  }

  return next;
}

export function emptyTriageState(): DailyHubTriageState {
  return { v: DAILY_HUB_TRIAGE_V, assignments: {} };
}

export function parseDailyHubTriageState(raw: unknown): DailyHubTriageState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyTriageState();
  const o = raw as Record<string, unknown>;
  if (o.v !== DAILY_HUB_TRIAGE_V) return emptyTriageState();
  if (!o.assignments || typeof o.assignments !== "object" || Array.isArray(o.assignments)) {
    return emptyTriageState();
  }
  const assignments: Record<string, DailyHubTriageAssignment> = {};
  const manualZones = new Set(["focus", "working", "holding", "parked"]);
  for (const [id, value] of Object.entries(o.assignments as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const zone = row.zone;
    const order = row.order;
    if (typeof zone !== "string" || !manualZones.has(zone)) continue;
    if (typeof order !== "number" || !Number.isFinite(order)) continue;
    assignments[id] = { zone: zone as DailyHubTriageAssignment["zone"], order };
  }
  return { v: DAILY_HUB_TRIAGE_V, assignments };
}

export function loadDailyHubTriage(userId: string | undefined): DailyHubTriageState {
  try {
    const raw = localStorage.getItem(storageKeyForDailyHubTriage(userId));
    if (!raw) return emptyTriageState();
    return parseDailyHubTriageState(JSON.parse(raw));
  } catch {
    return emptyTriageState();
  }
}

export function saveDailyHubTriage(userId: string | undefined, state: DailyHubTriageState): void {
  try {
    localStorage.setItem(storageKeyForDailyHubTriage(userId), JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}
