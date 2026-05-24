import { format, parseISO } from "date-fns";
import {
  CONTACT_SUBSCRIPTION_KINDS,
  CONTACT_SUBSCRIPTION_LABELS,
  type ContactSubscriptionKind,
} from "@/lib/contactSubscriptions";
import { daysUntilNextBirthday } from "@/lib/contactBirthday";

export type ContactSourceRow = {
  source: string;
  count: number;
};

export type ContactForSourceReport = {
  source: string | null;
  created_at: string | null;
};

/** Group contacts by source for §9 Contact Source report. */
export function buildContactSourceReport(contacts: ContactForSourceReport[]): ContactSourceRow[] {
  const counts = new Map<string, number>();
  for (const c of contacts) {
    const key = c.source?.trim() || "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

export type GciListingRow = {
  listingId: string;
  address: string;
  stage: string;
  searchPrice: number | null;
  projectedGci: number;
};

export function buildGciByListingReport(
  listings: {
    id: string;
    address: string;
    pipeline_stage: string | null;
    searchPrice: number | null;
  }[],
  commissionRatePct: number,
  stageLabel: (stage: string | null | undefined) => string,
): GciListingRow[] {
  const rate = Number.isFinite(commissionRatePct) ? Math.max(0, commissionRatePct) : 0;
  return listings
    .map((l) => {
      const price = l.searchPrice;
      const projectedGci = price != null ? (price * rate) / 100 : 0;
      return {
        listingId: l.id,
        address: l.address,
        stage: stageLabel(l.pipeline_stage),
        searchPrice: price,
        projectedGci,
      };
    })
    .filter((r) => r.projectedGci > 0)
    .sort((a, b) => b.projectedGci - a.projectedGci || a.address.localeCompare(b.address));
}

export type ContactsCreatedMonthRow = {
  monthKey: string;
  label: string;
  count: number;
};

function contactCreatedMonthKey(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  try {
    const d = iso.includes("T") ? parseISO(iso) : parseISO(`${iso.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, "yyyy-MM");
  } catch {
    return null;
  }
}

/** §9 Contact Created — counts by calendar month. */
export function buildContactsCreatedByMonth(
  contacts: ContactForSourceReport[],
): ContactsCreatedMonthRow[] {
  const counts = new Map<string, number>();
  for (const c of contacts) {
    const key = contactCreatedMonthKey(c.created_at);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([monthKey, count]) => ({
      monthKey,
      label: format(parseISO(`${monthKey}-01T12:00:00`), "MMM yyyy"),
      count,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export type AuctionStatusRow = {
  listingId: string;
  address: string;
  stage: string;
  saleMethod: string;
  displayPrice: string;
};

/** §9 Auction Status — current listings flagged as auction. */
export type ContactClassStatRow = {
  classId: string;
  className: string;
  contactCount: number;
};

/** §9 Contact Class Statistics — contacts per segment. */
export function buildContactClassStatistics(
  classes: { id: string; name: string }[],
  assignments: { contact_id: string; class_id: string }[],
): ContactClassStatRow[] {
  const counts = new Map<string, number>();
  const contactsPerClass = new Map<string, Set<string>>();
  for (const a of assignments) {
    if (!contactsPerClass.has(a.class_id)) contactsPerClass.set(a.class_id, new Set());
    contactsPerClass.get(a.class_id)!.add(a.contact_id);
  }
  for (const [classId, set] of contactsPerClass) {
    counts.set(classId, set.size);
  }
  return classes
    .map((c) => ({
      classId: c.id,
      className: c.name,
      contactCount: counts.get(c.id) ?? 0,
    }))
    .filter((r) => r.contactCount > 0)
    .sort((a, b) => b.contactCount - a.contactCount || a.className.localeCompare(b.className));
}

export function buildAuctionStatusReport(
  listings: {
    id: string;
    address: string;
    pipeline_stage: string | null;
    sale_method?: string | null;
    listed_as_auction?: boolean | null;
    display_price?: string | null;
    display_price_public?: string | null;
  }[],
  stageLabel: (stage: string | null | undefined) => string,
): AuctionStatusRow[] {
  return listings
    .filter(
      (l) =>
        l.listed_as_auction === true ||
        (l.sale_method ?? "").toLowerCase() === "auction",
    )
    .map((l) => ({
      listingId: l.id,
      address: l.address,
      stage: stageLabel(l.pipeline_stage),
      saleMethod: l.sale_method?.trim() || (l.listed_as_auction ? "auction" : "—"),
      displayPrice:
        l.display_price_public?.trim() ||
        l.display_price?.trim() ||
        "—",
    }))
    .sort((a, b) => a.address.localeCompare(b.address));
}

export type ContactUnsubscribedRow = {
  contactId: string;
  name: string;
  email: string;
  unsubscribedKinds: string[];
};

/** §9 Contact Unsubscribed — contacts with explicit opt-outs per subscription kind. */
export function buildContactUnsubscribedReport(
  contacts: { id: string; name: string | null; email?: string | null }[],
  subscriptionIndex: Map<string, Map<ContactSubscriptionKind, boolean>>,
): ContactUnsubscribedRow[] {
  const rows: ContactUnsubscribedRow[] = [];
  for (const c of contacts) {
    const subs = subscriptionIndex.get(c.id);
    if (!subs?.size) continue;
    const kinds: string[] = [];
    for (const kind of CONTACT_SUBSCRIPTION_KINDS) {
      if (subs.get(kind) === false) kinds.push(CONTACT_SUBSCRIPTION_LABELS[kind]);
    }
    if (kinds.length === 0) continue;
    rows.push({
      contactId: c.id,
      name: c.name?.trim() || "Unnamed",
      email: c.email?.trim() || "—",
      unsubscribedKinds: kinds,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export type ContactSuburbRow = {
  suburbKey: string;
  count: number;
};

/** §9 Contact Suburb Breakdown — contacts grouped by suburb/city + state. */
export function contactSuburbKey(
  cityInput: string | null | undefined,
  stateInput: string | null | undefined,
): string {
  const city = (cityInput ?? "").trim();
  const st = (stateInput ?? "").trim().toUpperCase();
  if (!city && !st) return "Unknown";
  if (city && st) return `${city}, ${st}`;
  return city || st;
}

export function buildContactSuburbBreakdownReport(
  contacts: { city?: string | null; state?: string | null }[],
): ContactSuburbRow[] {
  const counts = new Map<string, number>();
  for (const c of contacts) {
    const key = contactSuburbKey(c.city, c.state);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([suburbKey, count]) => ({ suburbKey, count }))
    .sort((a, b) => b.count - a.count || a.suburbKey.localeCompare(b.suburbKey));
}

export type ContactAnniversaryRow = {
  contactId: string;
  name: string;
  dateOfBirth: string;
  daysUntil: number;
  nextOccurrenceLabel: string;
};

/** §9 Contact Anniversary — upcoming birthdays (DOB) within window. */
export function buildContactAnniversaryReport(
  contacts: { id: string; name: string | null; date_of_birth?: string | null }[],
  withinDays = 30,
  from: Date = new Date(),
): ContactAnniversaryRow[] {
  const rows: ContactAnniversaryRow[] = [];
  for (const c of contacts) {
    const dob = c.date_of_birth?.trim();
    if (!dob) continue;
    const daysUntil = daysUntilNextBirthday(dob, from);
    if (daysUntil == null || daysUntil > withinDays) continue;
    const born = parseISO(`${dob.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(born.getTime())) continue;
    const y = from.getFullYear();
    let next = new Date(y, born.getMonth(), born.getDate(), 12, 0, 0);
    if (next < from) next = new Date(y + 1, born.getMonth(), born.getDate(), 12, 0, 0);
    rows.push({
      contactId: c.id,
      name: c.name?.trim() || "Unnamed",
      dateOfBirth: dob.slice(0, 10),
      daysUntil,
      nextOccurrenceLabel: format(next, "d MMM yyyy"),
    });
  }
  return rows.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
}

export type ProspectPropertyContactRow = {
  contactId: string;
  name: string;
  propertyCount: number;
  roles: string;
  sampleAddress: string;
};

/** §9 Prospect Property Contacts — contacts linked to at least one property. */
export function buildProspectPropertyContactsReport(
  contacts: {
    id: string;
    name: string | null;
    contact_property_links?: Array<{
      role?: string | null;
      properties?: { address_line1?: string | null; city?: string | null } | null;
    }>;
  }[],
): ProspectPropertyContactRow[] {
  return contacts
    .filter((c) => (c.contact_property_links?.length ?? 0) > 0)
    .map((c) => {
      const links = c.contact_property_links ?? [];
      const roles = [
        ...new Set(
          links.map((l) => (l.role?.trim() ? l.role.trim().replace(/_/g, " ") : "linked")),
        ),
      ].join(", ");
      const prop = links[0]?.properties;
      const sampleAddress =
        [prop?.address_line1, prop?.city].filter(Boolean).join(", ").trim() || "—";
      return {
        contactId: c.id,
        name: c.name?.trim() || "Unnamed",
        propertyCount: links.length,
        roles,
        sampleAddress,
      };
    })
    .sort((a, b) => b.propertyCount - a.propertyCount || a.name.localeCompare(b.name));
}

export function formatContactCreatedMonth(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    const d = iso.includes("T") ? parseISO(iso) : new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM yyyy");
  } catch {
    return "—";
  }
}
