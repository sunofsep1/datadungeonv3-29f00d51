/**
 * Shared merge-field resolution + unresolved-token guard.
 *
 * Why this exists: sequence-runner previously merged fields for SMS only. Email
 * steps sent `email_html` verbatim, so templates containing [suburb], [address],
 * [price] etc. went to clients with the brackets still in them. This module
 * resolves what can be resolved from CRM data and, critically, reports what
 * cannot - so the caller can fall back to a manual task instead of sending
 * something broken.
 */

export type MergeContact = {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  suburb?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  address?: string | null;
  address_line1?: string | null;
};

export type MergeExtras = {
  listingAddress?: string | null;
};

export type MergeContext = Record<string, string>;

export function suburbFromAddress(address?: string | null): string {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  const candidate = parts.length >= 3 ? parts[parts.length - 2] : parts[1];
  return candidate
    .replace(/\b(qld|queensland|nsw|vic|sa|wa|tas|nt|act)\b/gi, "")
    .replace(/\b\d{4}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMergeContext(contact: MergeContact | null, extras: MergeExtras = {}): MergeContext {
  const c = contact ?? {};
  const firstFromName = (c.name ?? "").trim().split(/\s+/)[0] ?? "";
  const first = (c.first_name ?? "").trim() || firstFromName;
  const last = (c.last_name ?? "").trim();
  const full = (c.name ?? "").trim() || [first, last].filter(Boolean).join(" ");

  const address = (extras.listingAddress ?? "").trim() ||
    (c.address ?? "").trim() ||
    (c.address_line1 ?? "").trim();

  const suburb = (c.suburb ?? "").trim() ||
    (c.city ?? "").trim() ||
    suburbFromAddress(extras.listingAddress ?? c.address ?? c.address_line1);

  const ctx: MergeContext = {
    first_name: first,
    firstname: first,
    last_name: last,
    lastname: last,
    name: full,
    fullname: full,
    suburb,
    area: suburb,
    city: suburb,
    state: (c.state ?? "").trim(),
    postcode: (c.postcode ?? "").trim(),
    address: address,
    property_address: address,
  };

  for (const k of Object.keys(ctx)) {
    if (!ctx[k]) delete ctx[k];
  }
  return ctx;
}

const CURLY = /\{\{\s*([a-z_][a-z0-9_]{1,30})\s*\}\}/gi;
// Widened 14 Aug 2026: the old pattern required 3+ word-chars, so tokens with a
// space or slash ([suburb/property type], [Beds/baths], [one line]) and short ones
// ([X], [Y], [D], [N]) were invisible to findUnresolvedTokens and got emailed
// verbatim. Any bracketed run is now treated as a token: unknown keys stay
// unsubstituted in applyMerge and correctly park the step instead of sending.
const SQUARE = /\[([^\]\n]{1,40})\]/gi;
const BRACE = /\{([a-z_][a-z0-9_]{1,30})\}/gi;

export function applyMerge(text: string | null | undefined, ctx: MergeContext): string {
  if (!text) return "";
  const swap = (_m: string, key: string) => {
    const v = ctx[key.toLowerCase()];
    return v === undefined ? _m : v;
  };
  return text.replace(CURLY, swap).replace(SQUARE, swap).replace(BRACE, swap);
}

export function findUnresolvedTokens(...texts: (string | null | undefined)[]): string[] {
  const found = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    for (const re of [CURLY, SQUARE, BRACE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(t)) !== null) found.add(m[0]);
    }
  }
  return [...found];
}
