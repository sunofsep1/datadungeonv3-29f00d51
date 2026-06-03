const DEFAULT_FLAGS: Record<string, boolean> = {
  compactNurtureV2: true,
  compactTimelineV1: true,
  fastImportV1: true,
};

const _cache = new Map<string, boolean>();

export function isFeatureEnabled(flag: keyof typeof DEFAULT_FLAGS): boolean {
  if (typeof window === "undefined") return DEFAULT_FLAGS[flag] ?? false;
  if (_cache.has(flag)) return _cache.get(flag)!;

  const stored = window.localStorage.getItem(`feature:${flag}`);
  const value =
    stored === "true" ? true
    : stored === "false" ? false
    : (DEFAULT_FLAGS[flag] ?? false);

  _cache.set(flag, value);
  return value;
}

/** Override a flag at runtime (e.g. from DevTools). */
export function setFeatureFlag(flag: keyof typeof DEFAULT_FLAGS, enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`feature:${flag}`, String(enabled));
  _cache.delete(flag);
}

