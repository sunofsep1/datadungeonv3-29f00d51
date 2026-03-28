/**
 * Title-case ALL-CAPS address fragments for display (suburbs, street names in caps, etc.).
 * Preserves mixed-case text, pure numbers, and common AU state abbreviations.
 */

const AU_STATE_DISPLAY: Record<string, string> = {
  QLD: "Qld",
  NSW: "NSW",
  VIC: "Vic",
  SA: "SA",
  WA: "WA",
  TAS: "Tas",
  NT: "NT",
  ACT: "ACT",
};

function toTitleCaseLetters(word: string): string {
  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Title-case a token that is shouting (all letters, length ≥ 2), or hyphenated all-caps. */
function titleCaseShoutingToken(word: string): string {
  if (/^\d+$/.test(word)) return word;

  const state = AU_STATE_DISPLAY[word.toUpperCase()];
  if (state) return state;

  if (word.includes("-")) {
    return word
      .split("-")
      .map((piece) => {
        if (!piece) return piece;
        if (/^\d+$/.test(piece)) return piece;
        if (/^[A-Z]{2,}$/.test(piece)) return toTitleCaseLetters(piece);
        return piece;
      })
      .join("-");
  }

  if (/^[A-Z]{2,}$/.test(word)) return toTitleCaseLetters(word);
  return word;
}

/** One line or field: tokenize on whitespace (no comma splitting). */
function formatSegment(segment: string): string {
  return segment
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => titleCaseShoutingToken(w))
    .join(" ");
}

/**
 * Normalize a single DB column (street, suburb, state, etc.) for storage.
 * Returns null for null/empty input.
 */
export function formatAddressFieldForStorage(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  if (!t) return null;
  return formatSegment(t);
}

/**
 * Apply to a full address string (comma-separated segments as produced by formatPropertyAddress).
 */
export function formatAddressForDisplay(composed: string): string {
  if (!composed || composed === "—") return composed;

  return composed
    .split(/,\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => formatSegment(segment))
    .join(", ");
}
