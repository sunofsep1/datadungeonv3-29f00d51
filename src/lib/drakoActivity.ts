/**
 * drakoActivity.ts
 * Per-day activity counters for Drako quests — v1 backed by localStorage.
 *
 * Records the real CRM actions an agent takes today (touches, calls, task
 * completions, nurture steps, training runs) so the Lair quest board can show
 * live progress and complete quests as the work actually happens.
 *
 * Counts reset automatically at the start of each calendar day.
 */

export type DrakoActivityKind =
  | "touch"
  | "call"
  | "taskComplete"
  | "nurtureStep"
  | "training";

export const DRAKO_ACTIVITY_EVENT = "drako:activity-updated";

const STORAGE_KEY = "drako_activity_v1";

export type DrakoActivityCounts = Partial<Record<DrakoActivityKind, number>>;

interface ActivityState {
  /** YYYY-MM-DD the counts belong to. */
  date: string;
  counts: DrakoActivityCounts;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): ActivityState {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: today, counts: {} };
    const parsed = JSON.parse(raw) as Partial<ActivityState>;
    // A stale day resets to an empty board.
    if (parsed.date !== today) return { date: today, counts: {} };
    return { date: today, counts: parsed.counts ?? {} };
  } catch {
    return { date: today, counts: {} };
  }
}

function save(state: ActivityState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (private browsing, quota, etc.)
  }
}

/** Record one (or more) of a given activity for today and notify listeners. */
export function recordDrakoActivity(kind: DrakoActivityKind, n = 1): void {
  const state = load();
  state.counts[kind] = (state.counts[kind] ?? 0) + n;
  save(state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DRAKO_ACTIVITY_EVENT));
  }
}

/** Read today's activity counts without mutating anything. */
export function readDrakoActivityToday(): DrakoActivityCounts {
  return load().counts;
}

/** Reset today's activity (useful for testing). */
export function resetDrakoActivity(): void {
  save({ date: todayKey(), counts: {} });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DRAKO_ACTIVITY_EVENT));
  }
}
