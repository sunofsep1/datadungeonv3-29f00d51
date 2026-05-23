/** Reapit-style duplicate contact detection (email / phone fingerprint). */

export type ContactDuplicateCandidate = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  matchReasons: string[];
};

export function normalizeContactEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e && e.includes("@") ? e : null;
}

/** Last 9 digits for AU mobile matching. */
export function normalizeContactPhoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.length >= 10 && digits.startsWith("61")) return digits.slice(-9);
  if (digits.length >= 10 && digits.startsWith("0")) return digits.slice(-9);
  return digits.slice(-9);
}

function phoneMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = normalizeContactPhoneKey(a);
  const kb = normalizeContactPhoneKey(b);
  return !!ka && !!kb && ka === kb;
}

export function findContactDuplicates(
  candidates: Array<{
    id: string;
    name: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
  }>,
  input: {
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    excludeId?: string | null;
  },
): ContactDuplicateCandidate[] {
  const normEmail = normalizeContactEmail(input.email);
  const inputPhones = [input.phone, input.mobile].filter(Boolean) as string[];
  const out: ContactDuplicateCandidate[] = [];

  for (const row of candidates) {
    if (input.excludeId && row.id === input.excludeId) continue;
    const reasons: string[] = [];
    if (normEmail && normalizeContactEmail(row.email) === normEmail) {
      reasons.push("Same email");
    }
    for (const p of inputPhones) {
      if (phoneMatches(p, row.phone) || phoneMatches(p, row.mobile)) {
        reasons.push("Same phone");
        break;
      }
    }
    if (reasons.length === 0) continue;
    out.push({
      id: row.id,
      name: row.name,
      email: row.email ?? null,
      phone: row.phone ?? null,
      mobile: row.mobile ?? null,
      matchReasons: reasons,
    });
  }

  return out;
}
