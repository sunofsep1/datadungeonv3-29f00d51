import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  LISTING_KANBAN_COLUMN_IDS,
  LISTING_PIPELINE_STAGE_OPTIONS,
  listingKanbanColumnId,
  type ListingKanbanColumnId,
} from "@/lib/listingKanbanStages";
import { listingPublicPriceLabel, listingSearchPrice, type ListingPriceSource } from "@/lib/listingPriceFields";

export type ListingReportRow = ListingPriceSource & {
  id: string;
  address: string;
  pipeline_stage: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  key_date_listed?: string | null;
  key_date_agency_expiry?: string | null;
  key_date_settlement?: string | null;
  campaign_start_at?: string | null;
  campaign_enquiry_count?: number | null;
  campaign_inspection_count?: number | null;
  campaign_offers_count?: number | null;
  commission_gross_pct?: number | null;
  contacts?: { id: string; name: string } | null;
};

export function pipelineStageLabel(stage: string | null | undefined): string {
  const col = listingKanbanColumnId(stage);
  return LISTING_PIPELINE_STAGE_OPTIONS.find((s) => s.id === col)?.label ?? col;
}

/** Days on market — null for appraisal / past client stages. */
export function listingDaysOnMarket(
  listing: Pick<
    ListingReportRow,
    "pipeline_stage" | "key_date_listed" | "campaign_start_at" | "created_at"
  >,
  asOf: Date = new Date(),
): number | null {
  const col = listingKanbanColumnId(listing.pipeline_stage);
  if (col === "appraisal" || col === "past_client") return null;
  const anchor =
    listing.key_date_listed?.trim() ||
    listing.campaign_start_at?.trim() ||
    listing.created_at;
  if (!anchor) return null;
  const start = new Date(anchor);
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(0, differenceInCalendarDays(asOf, start));
}

export function listingListedDateIso(
  listing: Pick<ListingReportRow, "key_date_listed" | "campaign_start_at" | "created_at">,
): string | null {
  return listing.key_date_listed?.trim() || listing.campaign_start_at?.trim() || listing.created_at || null;
}

export function daysInPipelineStage(
  listing: Pick<ListingReportRow, "updated_at">,
  asOf: Date = new Date(),
): number {
  const updated = new Date(listing.updated_at);
  if (Number.isNaN(updated.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(asOf, updated));
}

export function daysUntilAgencyExpiry(
  listing: Pick<ListingReportRow, "key_date_agency_expiry">,
  asOf: Date = new Date(),
): number | null {
  const raw = listing.key_date_agency_expiry?.trim();
  if (!raw) return null;
  const expiry = new Date(raw);
  if (Number.isNaN(expiry.getTime())) return null;
  return differenceInCalendarDays(expiry, asOf);
}

export type PipelineMonitorSummary = {
  stage: ListingKanbanColumnId;
  label: string;
  count: number;
  listings: ListingReportRow[];
};

export function buildPipelineMonitor(listings: ListingReportRow[]): PipelineMonitorSummary[] {
  const buckets = new Map<ListingKanbanColumnId, ListingReportRow[]>();
  for (const col of LISTING_KANBAN_COLUMN_IDS) {
    buckets.set(col, []);
  }
  for (const row of listings) {
    const col = listingKanbanColumnId(row.pipeline_stage);
    buckets.get(col)?.push(row);
  }
  return LISTING_KANBAN_COLUMN_IDS.map((stage) => ({
    stage,
    label: pipelineStageLabel(stage),
    count: buckets.get(stage)?.length ?? 0,
    listings: (buckets.get(stage) ?? []).slice().sort((a, b) => a.address.localeCompare(b.address)),
  }));
}

export type DomReportRow = ListingReportRow & {
  domDays: number;
  listedDate: string;
};

export function buildDaysOnMarketReport(
  listings: ListingReportRow[],
  asOf: Date = new Date(),
): DomReportRow[] {
  const rows: DomReportRow[] = [];
  for (const listing of listings) {
    const dom = listingDaysOnMarket(listing, asOf);
    if (dom == null) continue;
    const listedDate = listingListedDateIso(listing);
    if (!listedDate) continue;
    rows.push({ ...listing, domDays: dom, listedDate });
  }
  return rows.sort((a, b) => b.domDays - a.domDays || a.address.localeCompare(b.address));
}

export type AgencyExpiryReportRow = ListingReportRow & {
  expiryDate: string;
  daysUntil: number;
};

export function buildAgencyExpiryReport(
  listings: ListingReportRow[],
  options: { withinDays?: number; includeExpired?: boolean } = {},
  asOf: Date = new Date(),
): AgencyExpiryReportRow[] {
  const withinDays = options.withinDays ?? 90;
  const includeExpired = options.includeExpired ?? true;
  const rows: AgencyExpiryReportRow[] = [];

  for (const listing of listings) {
    const daysUntil = daysUntilAgencyExpiry(listing, asOf);
    const raw = listing.key_date_agency_expiry?.trim();
    if (daysUntil == null || !raw) continue;
    if (daysUntil > withinDays) continue;
    if (!includeExpired && daysUntil < 0) continue;
    rows.push({
      ...listing,
      expiryDate: raw,
      daysUntil,
    });
  }

  return rows.sort((a, b) => a.daysUntil - b.daysUntil || a.address.localeCompare(b.address));
}

export function daysUntilSettlement(
  listing: Pick<ListingReportRow, "key_date_settlement">,
  asOf: Date = new Date(),
): number | null {
  const raw = listing.key_date_settlement?.trim();
  if (!raw) return null;
  const settlement = new Date(raw);
  if (Number.isNaN(settlement.getTime())) return null;
  return differenceInCalendarDays(settlement, asOf);
}

export type UpcomingSettlementReportRow = ListingReportRow & {
  settlementDate: string;
  daysUntil: number;
};

export function buildUpcomingSettlementsReport(
  listings: ListingReportRow[],
  options: { withinDays?: number; includePast?: boolean } = {},
  asOf: Date = new Date(),
): UpcomingSettlementReportRow[] {
  const withinDays = options.withinDays ?? 60;
  const includePast = options.includePast ?? false;
  const rows: UpcomingSettlementReportRow[] = [];

  for (const listing of listings) {
    const col = listingKanbanColumnId(listing.pipeline_stage);
    if (col !== "under_contract" && col !== "unconditional" && col !== "settled") continue;
    const daysUntil = daysUntilSettlement(listing, asOf);
    const raw = listing.key_date_settlement?.trim();
    if (daysUntil == null || !raw) continue;
    if (daysUntil > withinDays) continue;
    if (!includePast && daysUntil < 0) continue;
    rows.push({ ...listing, settlementDate: raw, daysUntil });
  }

  return rows.sort((a, b) => a.daysUntil - b.daysUntil || a.address.localeCompare(b.address));
}

export function formatReportDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    const d = iso.includes("T") ? parseISO(iso) : new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "d MMM yyyy");
  } catch {
    return "—";
  }
}

export function formatReportAud(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function reportPublicPrice(listing: ListingPriceSource): string {
  return listingPublicPriceLabel(listing, formatReportAud);
}

export function reportSearchPrice(listing: ListingPriceSource): string {
  return formatReportAud(listingSearchPrice(listing));
}
