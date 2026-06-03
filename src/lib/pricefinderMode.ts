export type PricefinderMode = "pdf" | "api";

const SESSION_API_UNAVAILABLE = "dd_pricefinder_api_unavailable_v1";

export const PRICEFINDER_PORTAL_URL = "https://app.pricefinder.com.au/v4/app";

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
  if (trimmed) await copyTextToClipboard(trimmed);
  window.open(PRICEFINDER_PORTAL_URL, "_blank", "noopener,noreferrer");
}
