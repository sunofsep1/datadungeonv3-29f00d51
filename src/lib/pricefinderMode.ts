export type PricefinderMode = "pdf" | "api";

const SESSION_API_UNAVAILABLE = "dd_pricefinder_api_unavailable_v1";

export const PRICEFINDER_PORTAL_URL = "https://app.pricefinder.com.au/v4/app";

/**
 * Build a Pricefinder search-page URL.
 *
 * The base path lands on the search form after login. The `searchPhrase`
 * query parameter is passed as a best-effort pre-fill; if the current
 * Pricefinder version doesn't honour it, the user still lands on the search
 * form with the address already in their clipboard.
 */
export function buildPricefinderSearchUrl(address?: string | null): string {
  const base = `${PRICEFINDER_PORTAL_URL}?page=common%2Fsearch%2FSearchMenu&service=page`;
  const trimmed = address?.trim();
  if (!trimmed) return base;
  return `${base}&searchPhrase=${encodeURIComponent(trimmed)}`;
}

export function markPricefinderApiUnavailable(): void {
  try {
    sessionStorage.setItem(SESSION_API_UNAVAILABLE, "1");
  } catch {
    // ignore
  }
}

export function clearPricefinderApiUnavailable(): void {
  try {
    sessionStorage.removeItem(SESSION_API_UNAVAILABLE);
  } catch {
    // ignore
  }
}

export function isPricefinderApiUnavailableSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_API_UNAVAILABLE) === "1";
  } catch {
    return false;
  }
}

/** Effective UI mode: API only when server reports OAuth and session has not failed recently. */
export function resolvePricefinderMode(serverMode: PricefinderMode | undefined): PricefinderMode {
  if (serverMode === "api" && !isPricefinderApiUnavailableSession()) return "api";
  return "pdf";
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function openPricefinderPortal(address?: string | null): Promise<void> {
  const trimmed = address?.trim();
  // Open to the search page with address pre-populated (synchronous so no popup blocker).
  const url = buildPricefinderSearchUrl(trimmed);
  window.open(url, "_blank", "noopener,noreferrer");
  // Also copy to clipboard as a fallback if searchPhrase isn't honoured.
  if (trimmed) await copyTextToClipboard(trimmed);
}
