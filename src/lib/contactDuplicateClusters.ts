/**
 * Client-side duplicate detection for contacts (same email or same normalized phone).
 * Used on Data Health; keep logic deterministic and cheap for typical single-agent DB sizes.
 */

export type ContactDuplicateInput = {
  id: string;
  name: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
};

export type ContactDuplicateCluster = {
  matchOn: "email" | "phone";
  /** Stable key for React lists */
  clusterKey: string;
  /** Human-readable match value */
  displayLabel: string;
  contacts: { id: string; name: string | null }[];
};

function normalizeEmail(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s || !s.includes("@")) return null;
  return s;
}

/**
 * Canonical AU-style mobile key: digits only, `04xxxxxxxx` when possible so +61 and 04 match.
 */
export function normalizePhoneKey(raw: string | null | undefined): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.length < 8) return null;
  if (d.length === 11 && d.startsWith("61")) {
    d = `0${d.slice(2)}`;
  }
  if (d.length === 9 && d.startsWith("4")) {
    d = `0${d}`;
  }
  if (d.length >= 10) return d.slice(-10);
  return d;
}

function distinctPhoneKeys(c: ContactDuplicateInput): string[] {
  const out = new Set<string>();
  const a = normalizePhoneKey(c.phone);
  const b = normalizePhoneKey(c.mobile);
  if (a) out.add(a);
  if (b) out.add(b);
  return [...out];
}

/**
 * Returns clusters where at least two contacts share the same email or phone key.
 * A contact may appear in multiple clusters (e.g. same person matched on email and phone).
 */
export function findContactDuplicateClusters(contacts: ContactDuplicateInput[]): ContactDuplicateCluster[] {
  const byEmail = new Map<string, ContactDuplicateInput[]>();
  const byPhone = new Map<string, ContactDuplicateInput[]>();

  for (const c of contacts) {
    const em = normalizeEmail(c.email);
    if (em) {
      const list = byEmail.get(em) ?? [];
      list.push(c);
      byEmail.set(em, list);
    }
    for (const pk of distinctPhoneKeys(c)) {
      const list = byPhone.get(pk) ?? [];
      list.push(c);
      byPhone.set(pk, list);
    }
  }

  const clusters: ContactDuplicateCluster[] = [];

  for (const [email, list] of byEmail) {
    if (list.length < 2) continue;
    const seen = new Set<string>();
    const uniq = list.filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
    if (uniq.length < 2) continue;
    clusters.push({
      matchOn: "email",
      clusterKey: `email:${email}`,
      displayLabel: email,
      contacts: uniq.map((x) => ({ id: x.id, name: x.name })),
    });
  }

  for (const [pk, list] of byPhone) {
    if (list.length < 2) continue;
    const seen = new Set<string>();
    const uniq = list.filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
    if (uniq.length < 2) continue;
    clusters.push({
      matchOn: "phone",
      clusterKey: `phone:${pk}`,
      displayLabel: pk,
      contacts: uniq.map((x) => ({ id: x.id, name: x.name })),
    });
  }

  clusters.sort(
    (a, b) =>
      b.contacts.length - a.contacts.length ||
      a.matchOn.localeCompare(b.matchOn) ||
      a.displayLabel.localeCompare(b.displayLabel)
  );

  return clusters;
}
