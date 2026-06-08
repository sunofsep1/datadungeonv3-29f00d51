/** Normalize for fuzzy name comparison. */
export function normalizeOwnerName(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.'-]/g, "");
}

const OWNER_NAME_JUNK_PHRASES = [
  "owner type",
  "owner occupied",
  "owner details",
  "owner address",
  "owner name",
  "owner names",
  "property details",
  "property report",
  "property type",
  "phone",
  "normal sale",
  "single unit",
  "land use",
  "valuation amount",
  "sales history",
  "mailing address",
  "postal address",
];

const OWNER_LABEL_WORDS = new Set([
  "owner",
  "details",
  "type",
  "occupied",
  "address",
  "name",
  "names",
  "phone",
  "phones",
  "property",
  "normal",
  "sale",
  "single",
  "unit",
  "mailing",
  "postal",
  "land",
  "council",
  "valuation",
  "report",
  "na",
]);

function normalizeOwnerPhrase(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Reject PDF section labels mistaken for a single owner name. */
export function isPlausibleOwnerName(name: string | null | undefined): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed || trimmed.length < 3) return false;

  const lower = normalizeOwnerPhrase(trimmed);
  if (OWNER_NAME_JUNK_PHRASES.some((phrase) => lower === phrase || lower.includes(phrase))) {
    return false;
  }

  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.every((word) => OWNER_LABEL_WORDS.has(word))) return false;
  if (words.length < 2) return false;
  if (!/[A-Za-z]{2,}/.test(trimmed)) return false;

  return true;
}

/** Reject combined owner strings that are only PDF label junk. */
export function isPlausibleOwnerNames(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return false;
  const parts = parseOwnerNameSegments(trimmed);
  return parts.length > 0 && parts.every(isPlausibleOwnerName);
}

/** Drop label junk from a combined owner string; returns null if nothing plausible remains. */
export function sanitizeOwnerNamesRaw(raw: string | null | undefined): string | null {
  const parts = parseOwnerNameSegments(raw).filter(isPlausibleOwnerName);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;

  const surnames = parts.map(ownerSurnameToken).filter(Boolean);
  if (new Set(surnames).size >= 2) return parts.join("; ");
  return parts.join(" & ");
}

/**
 * Split stacked co-owners that share a surname (common in Pricefinder PDFs).
 * e.g. "THOMAS MURPHY MICHAEL JOHN MURPHY" → two names.
 */
function splitSharedSurnameNames(raw: string): string[] {
  const normalized = raw.trim().replace(/\s+/g, " ");
  if (!normalized) return [];

  const words = normalized.split(" ");
  if (words.length < 4) return [titleCaseOwnerName(normalized)];

  const surname = words[words.length - 1]!;
  const surnameIndices: number[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i]!.toUpperCase() === surname.toUpperCase()) surnameIndices.push(i);
  }
  if (surnameIndices.length < 2) return [titleCaseOwnerName(normalized)];

  const parts: string[] = [];
  let start = 0;
  for (let si = 0; si < surnameIndices.length - 1; si++) {
    const end = surnameIndices[si]!;
    parts.push(titleCaseOwnerName(words.slice(start, end + 1).join(" ")));
    start = end + 1;
  }
  parts.push(titleCaseOwnerName(words.slice(start).join(" ")));

  return parts.length >= 2 ? parts : [titleCaseOwnerName(normalized)];
}

/**
 * Split ampersand-separated co-owners. In Pricefinder, `&` means shared surname
 * (surname usually appears only on the last person). Use `;` for different surnames.
 */
function expandSameSurnameCouple(segment: string): string[] {
  const parts = segment
    .split(/\s+&\s+|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return splitSharedSurnameNames(segment);

  const titledParts = parts.map(titleCaseOwnerName);
  const wordGroups = titledParts.map((part) => part.split(/\s+/).filter(Boolean));
  const lastGroup = wordGroups[wordGroups.length - 1]!;
  const firstGroup = wordGroups[0]!;

  // Prefer surname from the last multi-word part (Pricefinder puts shared surname there).
  let coupleSurname: string | null = null;
  if (lastGroup.length >= 2) {
    coupleSurname = lastGroup[lastGroup.length - 1]!;
  } else if (firstGroup.length >= 2) {
    coupleSurname = firstGroup[firstGroup.length - 1]!;
  }
  if (!coupleSurname) return titledParts;

  return titledParts.map((tc, i) => {
    const words = wordGroups[i]!;
    const hasCoupleSurname = words.some((w) => w.toLowerCase() === coupleSurname!.toLowerCase());
    if (hasCoupleSurname) return tc;

    const needsSurname =
      (lastGroup.length >= 2 && words.length < lastGroup.length) ||
      (lastGroup.length === 1 && words.length === 1 && i > 0 && firstGroup.length >= 2);

    if (needsSurname) return `${tc} ${coupleSurname}`;

    return tc;
  });
}

/** Split combined owner string from Pricefinder reports into individual names. */
function parseOwnerNameSegments(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];

  const segments = raw
    .split(/\n|;|\r/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pieces = segments.flatMap((segment) => {
    if (/\s+&\s+|\s+and\s+/i.test(segment)) {
      return expandSameSurnameCouple(segment);
    }
    const byComma = segment
      .split(/,/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (byComma.length > 1) return byComma.map(titleCaseOwnerName);
    return splitSharedSurnameNames(segment);
  });

  return pieces.filter(Boolean);
}

export function splitOwnerNames(raw: string | null | undefined): string[] {
  return parseOwnerNameSegments(raw).filter(isPlausibleOwnerName);
}

/** Last token when 2+ words, else empty. */
function ownerSurnameToken(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2 ? words[words.length - 1]!.toLowerCase() : "";
}

/** Collapse parsed owner list into canonical storage string (`&` shared, `;` different surnames). */
export function joinOwnerNames(raw: string | null | undefined): string | null {
  const parts = splitOwnerNames(raw);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;

  const surnames = parts.map(ownerSurnameToken).filter(Boolean);
  if (new Set(surnames).size >= 2) {
    return parts.join("; ");
  }
  return parts.join(" & ");
}

/** Title-case a name while preserving hyphenated parts (Mary-Ann). */
export function titleCaseOwnerName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((word) =>
        word
          .split("-")
          .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
          .join("-"),
      )
      .join(" ");
  }
  return trimmed;
}

export function splitFirstLastName(fullName: string): { first_name: string; last_name: string } {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { first_name: "", last_name: "" };
  if (words.length === 1) return { first_name: words[0]!, last_name: "" };
  const last_name = words[words.length - 1]!;
  const first_name = words.slice(0, -1).join(" ");
  return { first_name, last_name };
}

/** True when every split owner name matches a linked contact (normalized). */
export function allOwnersAlreadyLinked(
  ownerNamesRaw: string | null | undefined,
  linkedContactNames: string[],
): boolean {
  const owners = splitOwnerNames(ownerNamesRaw);
  if (owners.length === 0) return true;
  const linked = new Set(linkedContactNames.map(normalizeOwnerName));
  return owners.every((name) => linked.has(normalizeOwnerName(name)));
}

/** Owners from report not yet linked to the property. */
export function unlinkedOwnerNames(
  ownerNamesRaw: string | null | undefined,
  linkedContactNames: string[],
): string[] {
  const linked = new Set(linkedContactNames.map(normalizeOwnerName));
  return splitOwnerNames(ownerNamesRaw).filter((name) => !linked.has(normalizeOwnerName(name)));
}

/** Find best CRM contact match for an owner name (exact normalized match). */
export function findContactByOwnerName(
  ownerName: string,
  contacts: Array<{ id: string; name?: string | null }>,
): { id: string; name: string } | null {
  const target = normalizeOwnerName(ownerName);
  if (!target) return null;
  for (const c of contacts) {
    const name = (c.name ?? "").trim();
    if (!name) continue;
    if (normalizeOwnerName(name) === target) return { id: c.id, name };
  }
  return null;
}
