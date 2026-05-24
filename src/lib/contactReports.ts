import { format, parseISO } from "date-fns";
import {
  CONTACT_SUBSCRIPTION_KINDS,
  CONTACT_SUBSCRIPTION_LABELS,
  type ContactSubscriptionKind,
} from "@/lib/contactSubscriptions";

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
