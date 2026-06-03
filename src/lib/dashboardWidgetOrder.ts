/** Widget ids used by Dashboard grid — keep in sync with `renderWidget` switch in Dashboard.tsx */
export const DASHBOARD_WIDGET_IDS = [
  "commandCenter",
  "visionBoard",
  "affirmations",
  "stats",
  "calendar",
  "kpi",
  "pipeline",
  "activityFeed",
  "todo",
  "contactTasks",
  "activeSequences",
  "recentContacts",
  "upcomingAppointments",
  "upcomingInspections",
  "quickActions",
] as const;

/** Essentials-first defaults for new users and "Restore defaults". */
export const DASHBOARD_DEFAULT_WIDGET_ORDER = [
  "visionBoard",
  "affirmations",
  "calendar",
] as const;

const LEGACY_STORAGE_KEY = "dashboard-widget-order";

/**
 * Bump when adding new widget types so existing users get them appended once (see WIDGETS_INTRODUCED_IN_SCHEMA).
 * Removing widgets from the saved order is respected and does not re-append deleted ids.
 */
export const CURRENT_DASHBOARD_SCHEMA = 6;

/** For each schema version, widget ids to append to the end of the user's order if missing (new features). */
export const WIDGETS_INTRODUCED_IN_SCHEMA: Record<number, readonly string[]> = {
  /** Nurture live enrollments widget (was missing from saved layouts created before this id existed). */
  3: ["activeSequences"],
  /** Dashboard command center was made movable as a regular widget. */
  4: ["commandCenter"],
  /** Open-for-inspection times across listings. */
  6: ["upcomingInspections"],
};

const LEGACY_SCHEMA_KEY = `${LEGACY_STORAGE_KEY}:schema`;

function schemaStorageKey(userId: string | undefined): string {
  return userId ? `${LEGACY_STORAGE_KEY}:schema:user:${userId}` : LEGACY_SCHEMA_KEY;
}

function readSavedSchema(userId: string | undefined): number {
  try {
    const v = localStorage.getItem(schemaStorageKey(userId));
    if (v != null && v !== "") return Math.max(0, parseInt(v, 10) || 0);
  } catch {
    /* ignore */
  }
  return 0;
}

function writeSavedSchema(userId: string | undefined, schema: number): void {
  try {
    localStorage.setItem(schemaStorageKey(userId), String(schema));
  } catch {
    /* ignore */
  }
}

/** Keep only known widget ids; do not re-inject missing widgets (user may have removed them). */
export function mergeDashboardWidgetOrder(stored: unknown): string[] {
  const allowed = new Set<string>(DASHBOARD_WIDGET_IDS);
  return Array.isArray(stored)
    ? stored.filter((id): id is string => typeof id === "string" && allowed.has(id))
    : [];
}

function applySchemaMigrations(order: string[], userId: string | undefined): string[] {
  const next = [...order];
  const saved = readSavedSchema(userId);
  if (saved < CURRENT_DASHBOARD_SCHEMA) {
    for (let s = saved + 1; s <= CURRENT_DASHBOARD_SCHEMA; s++) {
      const introduced = WIDGETS_INTRODUCED_IN_SCHEMA[s];
      if (!introduced?.length) continue;
      for (const id of introduced) {
        if (!next.includes(id)) next.push(id);
      }
    }
    writeSavedSchema(userId, CURRENT_DASHBOARD_SCHEMA);
  }
  return next;
}

export function storageKeyForDashboardWidgets(userId: string | undefined): string {
  return userId ? `${LEGACY_STORAGE_KEY}:user:${userId}` : LEGACY_STORAGE_KEY;
}

/** Load order: per-user key first, then legacy global key (one-time migration into user key). */
export function loadDashboardWidgetOrder(userId: string | undefined): string[] {
  const userKey = storageKeyForDashboardWidgets(userId);
  try {
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const merged = mergeDashboardWidgetOrder(JSON.parse(raw));
      return applySchemaMigrations(merged, userId);
    }
  } catch {
    /* ignore */
  }
  if (userId) {
    try {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const merged = mergeDashboardWidgetOrder(JSON.parse(legacy));
        try {
          localStorage.setItem(userKey, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        return applySchemaMigrations(merged, userId);
      }
    } catch {
      /* ignore */
    }
  }
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const merged = mergeDashboardWidgetOrder(JSON.parse(legacy));
      return applySchemaMigrations(merged, userId);
    }
  } catch {
    /* ignore */
  }
  const defaults = [...DASHBOARD_DEFAULT_WIDGET_ORDER];
  writeSavedSchema(userId, CURRENT_DASHBOARD_SCHEMA);
  return defaults;
}

export function saveDashboardWidgetOrder(userId: string | undefined, order: string[]): void {
  try {
    localStorage.setItem(storageKeyForDashboardWidgets(userId), JSON.stringify(order));
  } catch {
    /* quota / private mode */
  }
}

/** Restore default widget set and persist. */
export function resetDashboardWidgetsToDefault(userId: string | undefined): string[] {
  const next = [...DASHBOARD_DEFAULT_WIDGET_ORDER];
  saveDashboardWidgetOrder(userId, next);
  writeSavedSchema(userId, CURRENT_DASHBOARD_SCHEMA);
  return next;
}

export const DASHBOARD_WIDGET_LABELS: Record<string, string> = {
  commandCenter: "Command center",
  visionBoard: "Vision board",
  affirmations: "Affirmations",
  stats: "Stats",
  calendar: "Calendar",
  kpi: "KPI snapshot",
  pipeline: "Listing pipeline",
  activityFeed: "Activity",
  todo: "To-do",
  contactTasks: "Contact tasks",
  activeSequences: "Nurture sequences",
  recentContacts: "Recent contacts",
  upcomingAppointments: "Appointments",
  upcomingInspections: "Upcoming inspections",
  quickActions: "Quick actions",
};
