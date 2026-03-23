/**
 * Format comma-separated addresses for professional print (title case, state acronyms preserved).
 */
const REGION_ACRONYMS = new Set(["QLD", "NSW", "VIC", "SA", "WA", "NT", "ACT", "TAS"]);

function titleCaseWords(s: string): string {
  const t = s.trim();
  if (!t) return "";
  const upper = t.toUpperCase();
  if (REGION_ACRONYMS.has(upper)) return upper;
  return t
    .split(/\s+/)
    .map((word) => {
      if (/^\d+[a-zA-Z]?$/.test(word)) return word;
      if (word.length <= 4 && word === word.toUpperCase() && /^[A-Z0-9]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function formatAddressForPrint(raw: string): string {
  if (!raw || raw.trim() === "—") return "";
  return raw
    .split(",")
    .map((part) => titleCaseWords(part))
    .filter(Boolean)
    .join(", ");
}
