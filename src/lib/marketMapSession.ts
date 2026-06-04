const SESSION_MARKET_KEY = "contact_markets_selected_v1";

export function loadSessionMarketId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_MARKET_KEY);
  } catch {
    return null;
  }
}

export function saveSessionMarketId(marketId: string | null): void {
  try {
    if (marketId) sessionStorage.setItem(SESSION_MARKET_KEY, marketId);
    else sessionStorage.removeItem(SESSION_MARKET_KEY);
  } catch {
    // ignore
  }
}
