/** Normalize for fuzzy name comparison. */
export function normalizeOwnerName(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.'-]/g, "");
}

/** Split combined owner string from Pricefinder reports into individual names. */
export function splitOwnerNames(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/(?:\s+&\s+|\s+and\s+|,)/i)
    .map((s) => titleCaseOwnerName(s.trim()))
    .filter(Boolean);
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
  const s = fullName.trim();
  const i = s.indexOf(" ");
  if (i <= 0) return { first_name: s, last_name: "" };
  return { first_name: s.slice(0, i).trim(), last_name: s.slice(i + 1).trim() };
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
