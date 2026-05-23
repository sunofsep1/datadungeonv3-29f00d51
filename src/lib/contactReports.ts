import { format, parseISO } from "date-fns";

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
