const STORAGE_KEY = "drako_streak_v1";

export interface DrakoStreakState {
  lastVisit: string | null;
  current: number;
  longest: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadStreak(): DrakoStreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastVisit: null, current: 0, longest: 0 };
    const parsed = JSON.parse(raw) as Partial<DrakoStreakState>;
    return {
      lastVisit: typeof parsed.lastVisit === "string" ? parsed.lastVisit : null,
      current: typeof parsed.current === "number" ? parsed.current : 0,
      longest: typeof parsed.longest === "number" ? parsed.longest : 0,
    };
  } catch {
    return { lastVisit: null, current: 0, longest: 0 };
  }
}

function saveStreak(state: DrakoStreakState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** Record a Lair visit; increments streak once per calendar day. */
export function recordLairVisit(): DrakoStreakState {
  const prev = loadStreak();
  const today = todayKey();

  if (prev.lastVisit === today) return prev;

  let current = 1;
  if (prev.lastVisit) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    current = prev.lastVisit === yesterdayKey ? prev.current + 1 : 1;
  }

  const next: DrakoStreakState = {
    lastVisit: today,
    current,
    longest: Math.max(prev.longest, current),
  };
  saveStreak(next);
  return next;
}

export function readStreak(): DrakoStreakState {
  return loadStreak();
}
