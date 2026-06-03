import {
  DEFAULT_CONTACT_MARKETS,
  slugifyMarketId,
  type ContactMarket,
} from "@/lib/contactMarkets";

const STORAGE_KEY = "contact_markets_v1";

function parseMarkets(raw: unknown): ContactMarket[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ContactMarket[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<ContactMarket>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const suburbs = Array.isArray(row.suburbs)
      ? row.suburbs.map((s) => String(s).trim()).filter(Boolean)
      : [];
    if (!label || suburbs.length === 0) continue;
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : slugifyMarketId(label);
    out.push({
      id,
      label,
      suburbs,
      state: typeof row.state === "string" && row.state.trim() ? row.state.trim() : "QLD",
    });
  }
  return out.length > 0 ? out : null;
}

export function loadContactMarkets(): ContactMarket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTACT_MARKETS;
    const parsed = parseMarkets(JSON.parse(raw));
    return parsed ?? DEFAULT_CONTACT_MARKETS;
  } catch {
    return DEFAULT_CONTACT_MARKETS;
  }
}

export function saveContactMarkets(markets: ContactMarket[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markets));
    window.dispatchEvent(new Event("contact-markets-updated"));
  } catch {
    // ignore quota / private mode
  }
}

export const CONTACT_MARKETS_EVENT = "contact-markets-updated";
