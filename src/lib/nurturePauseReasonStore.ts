const STORAGE_KEY = "nurture.pauseReasons.v1";

type PauseReasonMap = Record<string, string>;

function readMap(): PauseReasonMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PauseReasonMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeMap(value: PauseReasonMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function getPauseReason(enrollmentId: string): string | null {
  const map = readMap();
  const value = map[enrollmentId];
  return value?.trim() ? value : null;
}

export function setPauseReason(enrollmentId: string, reason: string) {
  const map = readMap();
  map[enrollmentId] = reason.trim();
  writeMap(map);
}

export function clearPauseReason(enrollmentId: string) {
  const map = readMap();
  if (!(enrollmentId in map)) return;
  delete map[enrollmentId];
  writeMap(map);
}
