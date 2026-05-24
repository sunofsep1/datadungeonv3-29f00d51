import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { QLD_CONTRACT_CONDITIONS, type QldConditionField } from "@/lib/qldContractConditions";
import {
  LISTING_KANBAN_COLUMN_IDS,
  LISTING_PIPELINE_STAGE_OPTIONS,
  listingKanbanColumnId,
  type ListingKanbanColumnId,
} from "@/lib/listingKanbanStages";
import { offerStatusLabel } from "@/lib/listingOffers";
import { listingPublicPriceLabel, listingSearchPrice, type ListingPriceSource } from "@/lib/listingPriceFields";
import { listingRegionKey } from "@/lib/listingAddressRegion";

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
  property_id?: string | null;
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

/** Active pipeline listings (excludes appraisal and past client). */
export function buildCurrentListingsReport(listings: ListingReportRow[]): ListingReportRow[] {
  return listings
    .filter((l) => {
      const col = listingKanbanColumnId(l.pipeline_stage);
      return col !== "past_client" && col !== "appraisal";
    })
    .slice()
    .sort((a, b) => a.address.localeCompare(b.address));
}

const OPEN_OFFER_STATUSES = new Set([
  "submitted",
  "countered",
  "accepted",
  "conditional",
  "unconditional",
]);

export type OffersPipelineReportRow = {
  offerId: string;
  refCode: string;
  listingId: string;
  listingAddress: string;
  offerDate: string;
  offerPrice: number;
  status: string;
  statusLabel: string;
  buyerName: string;
};

export type OfferReportInput = {
  id: string;
  listing_id: string;
  ref_code: string;
  offer_date: string;
  offer_price: number;
  status: string;
  buyer?: { name: string | null; first_name: string | null; last_name: string | null } | null;
};

export type ContractConditionDueRow = {
  listingId: string;
  address: string;
  conditionLabel: string;
  dueDateIso: string;
  dueDateLabel: string;
  daysUntil: number;
  contractDateLabel: string;
};

type ListingContractFields = {
  id: string;
  address: string;
  key_date_contract?: string | null;
} & Partial<Record<QldConditionField, number | null>>;

function parseContractAnchor(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  try {
    const d = iso.includes("T") ? parseISO(iso) : parseISO(`${iso.slice(0, 10)}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  } catch {
    return null;
  }
}

/** §9 Contract Conditions Due — QLD-style condition deadlines from contract date + day counts. */
export function buildContractConditionsDueReport(
  listings: ListingContractFields[],
  options: { withinDays?: number; includeOverdue?: boolean } = {},
): ContractConditionDueRow[] {
  const withinDays = options.withinDays ?? 30;
  const includeOverdue = options.includeOverdue !== false;
  const today = startOfDay(new Date());
  const rows: ContractConditionDueRow[] = [];

  for (const listing of listings) {
    const contractStart = parseContractAnchor(listing.key_date_contract);
    if (!contractStart) continue;

    for (const cond of QLD_CONTRACT_CONDITIONS) {
      const days = listing[cond.field];
      if (days == null || !Number.isFinite(days) || days <= 0) continue;
      const due = startOfDay(addDays(contractStart, days));
      const daysUntil = differenceInCalendarDays(due, today);
      if (!includeOverdue && daysUntil < 0) continue;
      if (daysUntil > withinDays) continue;

      rows.push({
        listingId: listing.id,
        address: listing.address,
        conditionLabel: cond.title,
        dueDateIso: format(due, "yyyy-MM-dd"),
        dueDateLabel: format(due, "d MMM yyyy"),
        daysUntil,
        contractDateLabel: format(contractStart, "d MMM yyyy"),
      });
    }
  }

  return rows.sort(
    (a, b) =>
      a.daysUntil - b.daysUntil ||
      a.dueDateIso.localeCompare(b.dueDateIso) ||
      a.address.localeCompare(b.address),
  );
}

export type UpcomingUnconditionalRow = ListingReportRow & {
  settlementDate: string;
  daysUntil: number;
};

/** §9 Upcoming unconditional sales — unconditional stage with settlement dates. */
export function buildUpcomingUnconditionalReport(
  listings: ListingReportRow[],
  options: { withinDays?: number; includePast?: boolean } = {},
  asOf: Date = new Date(),
): UpcomingUnconditionalRow[] {
  const withinDays = options.withinDays ?? 60;
  const includePast = options.includePast ?? false;
  const rows: UpcomingUnconditionalRow[] = [];

  for (const listing of listings) {
    if (listingKanbanColumnId(listing.pipeline_stage) !== "unconditional") continue;
    const daysUntil = daysUntilSettlement(listing, asOf);
    const raw = listing.key_date_settlement?.trim();
    if (daysUntil == null || !raw) continue;
    if (daysUntil > withinDays) continue;
    if (!includePast && daysUntil < 0) continue;
    rows.push({ ...listing, settlementDate: raw, daysUntil });
  }

  return rows.sort((a, b) => a.daysUntil - b.daysUntil || a.address.localeCompare(b.address));
}

export type SalesByRegionRow = {
  region: string;
  saleCount: number;
  totalValue: number;
};

/** §9 Sales by region — settled / past client listings grouped by suburb. */
export function buildSalesByRegionReport(
  listings: ListingReportRow[],
  propertyById: Map<string, { city?: string | null; suburb?: string | null; state?: string | null }>,
): SalesByRegionRow[] {
  const buckets = new Map<string, { count: number; value: number }>();

  for (const listing of listings) {
    const col = listingKanbanColumnId(listing.pipeline_stage);
    if (col !== "settled" && col !== "past_client") continue;
    const price = listingSearchPrice(listing);
    const propertyId = (listing as { property_id?: string | null }).property_id;
    const property = propertyId ? propertyById.get(propertyId) : null;
    const region = listingRegionKey(listing.address, property);
    const cur = buckets.get(region) ?? { count: 0, value: 0 };
    cur.count += 1;
    if (price != null) cur.value += price;
    buckets.set(region, cur);
  }

  return [...buckets.entries()]
    .map(([region, { count, value }]) => ({
      region,
      saleCount: count,
      totalValue: value,
    }))
    .sort((a, b) => b.saleCount - a.saleCount || b.totalValue - a.totalValue || a.region.localeCompare(b.region));
}

export type ListingsSalesSummaryRow = {
  stage: ListingKanbanColumnId;
  label: string;
  count: number;
  totalValue: number;
  projectedGci: number;
};

/** §9 No. of listings / sales summary — pipeline stage counts with value and GCI. */
export function buildListingsSalesSummaryReport(
  listings: ListingReportRow[],
  commissionRatePct: number,
): ListingsSalesSummaryRow[] {
  const rate = Number.isFinite(commissionRatePct) ? Math.max(0, commissionRatePct) : 0;
  const monitor = buildPipelineMonitor(listings);
  return monitor.map((bucket) => {
    let totalValue = 0;
    let projectedGci = 0;
    for (const l of bucket.listings) {
      const price = listingSearchPrice(l);
      if (price != null) {
        totalValue += price;
        projectedGci += (price * rate) / 100;
      }
    }
    return {
      stage: bucket.stage,
      label: bucket.label,
      count: bucket.count,
      totalValue,
      projectedGci,
    };
  });
}

export type AppraisalListingContactRow = {
  linkId: string;
  contactId: string;
  contactName: string;
  listingId: string;
  listingAddress: string;
  stage: string;
  role: string;
};

const APPRAISAL_LISTING_STAGES = new Set<ListingKanbanColumnId>(["appraisal", "listing"]);

/** §9 Appraisal / listing contacts — people linked to pre-sale listings. */
export function buildAppraisalListingContactsReport(
  links: Array<{
    id: string;
    contact_id: string;
    role: string;
    contacts?: { name: string | null; first_name: string | null; last_name: string | null } | null;
    listings?: { id: string; address: string | null; pipeline_stage: string | null } | null;
  }>,
): AppraisalListingContactRow[] {
  const rows: AppraisalListingContactRow[] = [];
  for (const link of links) {
    const listing = link.listings;
    if (!listing) continue;
    const col = listingKanbanColumnId(listing.pipeline_stage);
    if (!APPRAISAL_LISTING_STAGES.has(col)) continue;
    const c = link.contacts;
    const contactName =
      c?.name?.trim() ||
      [c?.first_name, c?.last_name].filter(Boolean).join(" ").trim() ||
      "Unnamed";
    rows.push({
      linkId: link.id,
      contactId: link.contact_id,
      contactName,
      listingId: listing.id,
      listingAddress: listing.address?.trim() || "—",
      stage: pipelineStageLabel(listing.pipeline_stage),
      role: link.role.replace(/_/g, " "),
    });
  }
  return rows.sort(
    (a, b) =>
      a.listingAddress.localeCompare(b.listingAddress) ||
      a.contactName.localeCompare(b.contactName),
  );
}

export function buildOffersPipelineReport(
  offers: OfferReportInput[],
  listingsById: Map<string, ListingReportRow>,
): OffersPipelineReportRow[] {
  const rows: OffersPipelineReportRow[] = [];
  for (const o of offers) {
    if (!OPEN_OFFER_STATUSES.has(o.status)) continue;
    const listing = listingsById.get(o.listing_id);
    const buyer = o.buyer;
    const buyerName =
      buyer?.name?.trim() ||
      [buyer?.first_name, buyer?.last_name].filter(Boolean).join(" ").trim() ||
      "—";
    rows.push({
      offerId: o.id,
      refCode: o.ref_code,
      listingId: o.listing_id,
      listingAddress: listing?.address ?? "—",
      offerDate: o.offer_date,
      offerPrice: o.offer_price,
      status: o.status,
      statusLabel: offerStatusLabel(o.status),
      buyerName,
    });
  }
  return rows.sort(
    (a, b) => b.offerDate.localeCompare(a.offerDate) || a.listingAddress.localeCompare(b.listingAddress),
  );
}
