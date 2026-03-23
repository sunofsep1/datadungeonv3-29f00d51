const DEFAULT_FLAGS: Record<string, boolean> = {
  compactNurtureV2: true,
  compactTimelineV1: true,
  fastImportV1: true,
};

export function isFeatureEnabled(flag: keyof typeof DEFAULT_FLAGS): boolean {
  if (typeof window === "undefined") return DEFAULT_FLAGS[flag];
  const stored = window.localStorage.getItem(`feature:${flag}`);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return DEFAULT_FLAGS[flag];
}

