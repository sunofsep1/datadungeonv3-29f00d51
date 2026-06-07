/** Normalize for fuzzy name comparison. */
export function normalizeOwnerName(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.'-]/g, "");
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

/** Split ampersand-separated co-owners; share surname when second part is given names only. */
function expandSameSurnameCouple(segment: string): string[] {
  const parts = segment
    .split(/\s+&\s+|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return splitSharedSurnameNames(segment);

  const first = titleCaseOwnerName(parts[0]!);
  const firstWords = first.split(/\s+/).filter(Boolean);
  const sharedSurname = firstWords.length >= 2 ? firstWords[firstWords.length - 1]! : "";

  return parts.map((part, i) => {
    const tc = titleCaseOwnerName(part);
    if (i === 0 || !sharedSurname) return tc;
    const words = tc.split(/\s+/).filter(Boolean);
    const lastToken = words[words.length - 1]?.toLowerCase() ?? "";
    // Already has a distinct surname (e.g. semicolon-separated couple re-joined with &)
    if (words.length >= 2 && lastToken !== sharedSurname.toLowerCase()) return tc;
    const hasSurname = words.some((w) => w.toLowerCase() === sharedSurname.toLowerCase());
    if (!hasSurname && words.length <= 2) return `${tc} ${sharedSurname}`;
    return tc;
  });
}

/** Split combined owner string from Pricefinder reports into individual names. */
export function splitOwnerNames(raw: string | null | undefined): string[] {
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

/** Collapse parsed owner list into a canonical "A & B" string for storage. */
export function joinOwnerNames(raw: string | null | undefined): string | null {
  const parts = splitOwnerNames(raw);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
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
