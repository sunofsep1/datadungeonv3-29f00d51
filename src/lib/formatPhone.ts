/**
 * Format phone numbers for display in a consistent way (e.g. 0400 000 000).
 * Storage and tel: links use raw/digits-only; use this only when rendering.
 */

/** Digits only from string */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Format a phone number for display as Australian mobile style: 04XX XXX XXX.
 * Accepts any input (with spaces, +61, etc.) and returns a consistent display string.
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (phone == null || typeof phone !== "string") return "";
  const digits = digitsOnly(phone);
  if (digits.length === 0) return phone.trim() || "";

  // Australian 10-digit mobile: 04XX XXX XXX
  if (digits.length === 10 && digits.startsWith("04")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  // Australian with leading 61: 614XX XXX XXX -> 04XX XXX XXX
  if (digits.length === 11 && digits.startsWith("61")) {
    const rest = digits.slice(2);
    if (rest.startsWith("4")) {
      return `0${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
    }
  }
  // 9 digits starting with 4: assume 0 prefix
  if (digits.length === 9 && digits.startsWith("4")) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  // Fallback: last 10 digits as 4 3 3
  if (digits.length >= 10) {
    const tail = digits.slice(-10);
    return `${tail.slice(0, 4)} ${tail.slice(4, 7)} ${tail.slice(7)}`;
  }
  if (digits.length >= 6) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return digits;
}

/**
 * Build a `tel:` href for mobile / desktop dialers. Returns null if there are no digits.
 */
export function phoneToTelHref(phone: string | null | undefined): string | null {
  if (phone == null || typeof phone !== "string") return null;
  const trimmed = phone.trim();
  const d = trimmed.replace(/\D/g, "");
  if (!d) return null;
  if (trimmed.startsWith("+")) return `tel:${trimmed.replace(/\s/g, "")}`;
  if (d.startsWith("61")) return `tel:+${d}`;
  if (d.startsWith("0") && d.length >= 9) return `tel:+61${d.slice(1)}`;
  if (d.length >= 9) return `tel:+${d}`;
  return `tel:${d}`;
}
