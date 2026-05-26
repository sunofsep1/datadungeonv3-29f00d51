/**
 * drakoProgress.ts
 * XP & levels engine for Drako — v1 backed by localStorage.
 *
 * XP sources and values:
 *   taskDone        +50   personal to-do completed
 *   contactTaskDone +60   contact follow-up task completed
 *   nurtureStep     +75   nurture sequence step advanced
 *   pipelineAdvance +100  listing moved to next pipeline stage
 *   touchLogged     +30   touch logged on a contact
 *   dealClosed      +500  listing marked as sold / deal closed
 *
 * Level thresholds are cumulative XP required to reach that level.
 * Level-up fires once per crossing — no double-counting.
 */

export type XpSource =
  | "taskDone"
  | "contactTaskDone"
  | "nurtureStep"
  | "pipelineAdvance"
  | "touchLogged"
  | "dealClosed";

export const XP_VALUES: Record<XpSource, number> = {
  taskDone: 50,
  contactTaskDone: 60,
  nurtureStep: 75,
  pipelineAdvance: 100,
  touchLogged: 30,
  dealClosed: 500,
};

/**
 * Cumulative XP needed to *reach* a given level.
 * Level 1 starts at 0. Level 2 requires 200 total XP, etc.
 * Max tracked level: 20.
 */
export const LEVEL_THRESHOLDS: number[] = [
  0,     // 1
  200,   // 2
  500,   // 3
  900,   // 4
  1_400, // 5
  2_000, // 6
  2_700, // 7
  3_500, // 8
  4_500, // 9
  5_700, // 10
  7_100, // 11
  8_700, // 12
  10_500, // 13
  12_500, // 14
  15_000, // 15
  18_000, // 16
  21_500, // 17
  25_500, // 18
  30_000, // 19
  35_000, // 20
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export interface DrakoProgressState {
  /** Total cumulative XP ever earned (never decremented). */
  totalXp: number;
  /** Current level (1-based, capped at MAX_LEVEL). */
  level: number;
}

const STORAGE_KEY = "drako_progress_v1";

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadProgress(): DrakoProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { totalXp: 0, level: 1 };
    const parsed = JSON.parse(raw) as Partial<DrakoProgressState>;
    return {
      totalXp: typeof parsed.totalXp === "number" ? parsed.totalXp : 0,
      level: typeof parsed.level === "number" ? parsed.level : 1,
    };
  } catch {
    return { totalXp: 0, level: 1 };
  }
}

function saveProgress(state: DrakoProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (private browsing, quota, etc.)
  }
}

// ---------------------------------------------------------------------------
// Level math
// ---------------------------------------------------------------------------

/** Derive the level for a given total XP amount. */
export function levelForXp(totalXp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, MAX_LEVEL);
}

/** XP threshold at the start of `level`. */
export function xpForLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.max(0, Math.min(level - 1, LEVEL_THRESHOLDS.length - 1))] ?? 0;
}

/** XP threshold at the start of `level + 1` (i.e. what you need to level up). */
export function xpForNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return xpForLevel(MAX_LEVEL); // Already capped
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 0;
}

/**
 * XP earned within the current level (for progress-bar rendering).
 * Returns a value in [0, xpSpanForLevel(level)].
 */
export function xpInCurrentLevel(totalXp: number, level: number): number {
  return totalXp - xpForLevel(level);
}

/**
 * Total XP span of the current level band (denominator for the progress bar).
 */
export function xpSpanOfLevel(level: number): number {
  if (level >= MAX_LEVEL) return 1; // Prevent divide-by-zero at cap
  return xpForNextLevel(level) - xpForLevel(level);
}

// ---------------------------------------------------------------------------
// Grant XP — the main mutation
// ---------------------------------------------------------------------------

export interface XpGrantResult {
  /** XP awarded in this grant. */
  awarded: number;
  /** Level before the grant. */
  prevLevel: number;
  /** Level after the grant. */
  newLevel: number;
  /** True if the grant caused one or more level-ups. */
  leveledUp: boolean;
  /** Full updated state after the grant. */
  state: DrakoProgressState;
}

/**
 * Award XP for a given source.
 * Mutates localStorage and returns the result so callers can react to level-ups.
 */
export function grantXpToStorage(source: XpSource): XpGrantResult {
  const awarded = XP_VALUES[source];
  const prev = loadProgress();
  const prevLevel = prev.level;
  const newTotalXp = prev.totalXp + awarded;
  const newLevel = levelForXp(newTotalXp);
  const nextState: DrakoProgressState = { totalXp: newTotalXp, level: newLevel };
  saveProgress(nextState);
  return {
    awarded,
    prevLevel,
    newLevel,
    leveledUp: newLevel > prevLevel,
    state: nextState,
  };
}

/** Read current progress without mutating anything. */
export function readProgress(): DrakoProgressState {
  return loadProgress();
}

/** Reset progress (useful for testing). */
export function resetProgress(): void {
  saveProgress({ totalXp: 0, level: 1 });
}
