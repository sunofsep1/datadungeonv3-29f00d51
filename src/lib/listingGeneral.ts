/** Reapit-style listing General / For sale fields (authority, outgoings, investment, legal). */

export type ForSaleOrLease = "for_sale" | "for_lease";
export type SaleMethod = "private_treaty" | "auction" | "tender" | "eoi";
export type AuthorityType = "exclusive" | "open" | "conjunctional" | "sole" | "multi";
export type GstStatus = "inclusive" | "exclusive" | "not_applicable";
export type OutgoingsPeriod = "pa" | "pq";

export const FOR_SALE_OR_LEASE_OPTIONS: { value: ForSaleOrLease; label: string }[] = [
  { value: "for_sale", label: "For sale" },
  { value: "for_lease", label: "For lease" },
];

export const SALE_METHOD_OPTIONS: { value: SaleMethod; label: string }[] = [
  { value: "private_treaty", label: "Private treaty" },
  { value: "auction", label: "Auction" },
  { value: "tender", label: "Tender" },
  { value: "eoi", label: "Expression of interest" },
];

export const AUTHORITY_TYPE_OPTIONS: { value: AuthorityType; label: string }[] = [
  { value: "exclusive", label: "Exclusive" },
  { value: "sole", label: "Sole" },
  { value: "open", label: "Open" },
  { value: "conjunctional", label: "Conjunctional" },
  { value: "multi", label: "Multi-list" },
];

export const GST_STATUS_OPTIONS: { value: GstStatus; label: string }[] = [
  { value: "inclusive", label: "GST inclusive" },
  { value: "exclusive", label: "GST exclusive" },
  { value: "not_applicable", label: "Not applicable" },
];

export const OUTGOINGS_PERIOD_OPTIONS: { value: OutgoingsPeriod; label: string }[] = [
  { value: "pa", label: "Per year" },
  { value: "pq", label: "Per quarter" },
];

export type ListingOutgoingsFields = {
  water_rates_amount?: number | null;
  water_rates_period?: string | null;
  council_rates_amount?: number | null;
  council_rates_period?: string | null;
  other_outgoings_amount?: number | null;
  other_outgoings_period?: string | null;
  land_tax_amount?: number | null;
  land_tax_period?: string | null;
  strata_admin_amount?: number | null;
  strata_admin_period?: string | null;
  strata_sinking_amount?: number | null;
  strata_sinking_period?: string | null;
};

export type ListingGeneralFields = ListingOutgoingsFields & {
  id: string;
  for_sale_or_lease?: string | null;
  sale_method?: string | null;
  listed_as_auction?: boolean | null;
  authority_type?: string | null;
  off_market?: boolean | null;
  hidden_listing?: boolean | null;
  quote_price?: number | null;
  gst_status?: string | null;
  access_details?: string | null;
  internal_info?: string | null;
  investment_flag?: boolean | null;
  lease_potential_weekly?: number | null;
  return_pct?: number | null;
  tenanted?: boolean | null;
  legal_description?: string | null;
  legal_lot?: string | null;
  legal_volume?: string | null;
  legal_block?: string | null;
  legal_deposited_plan?: string | null;
  legal_folio?: string | null;
  legal_section?: string | null;
  legal_zoning?: string | null;
};

export function annualizeOutgoingAmount(
  amount: number | null | undefined,
  period: string | null | undefined,
): number {
  if (amount == null || !Number.isFinite(Number(amount))) return 0;
  const n = Number(amount);
  if (period === "pq") return n * 4;
  return n;
}

export function computeTotalOutgoingsPerYear(listing: ListingOutgoingsFields): number {
  const pairs: [number | null | undefined, string | null | undefined][] = [
    [listing.water_rates_amount, listing.water_rates_period],
    [listing.council_rates_amount, listing.council_rates_period],
    [listing.other_outgoings_amount, listing.other_outgoings_period],
    [listing.land_tax_amount, listing.land_tax_period],
    [listing.strata_admin_amount, listing.strata_admin_period],
    [listing.strata_sinking_amount, listing.strata_sinking_period],
  ];
  return pairs.reduce((sum, [amount, period]) => sum + annualizeOutgoingAmount(amount, period), 0);
}

export function formatListingMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function parseListingMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function parsePercentInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : null;
}

export const OUTGOING_FIELD_GROUPS: {
  amountKey: keyof ListingOutgoingsFields;
  periodKey: keyof ListingOutgoingsFields;
  label: string;
}[] = [
  { amountKey: "water_rates_amount", periodKey: "water_rates_period", label: "Water rates" },
  { amountKey: "council_rates_amount", periodKey: "council_rates_period", label: "Council rates" },
  { amountKey: "other_outgoings_amount", periodKey: "other_outgoings_period", label: "Other outgoings" },
  { amountKey: "land_tax_amount", periodKey: "land_tax_period", label: "Land tax" },
  { amountKey: "strata_admin_amount", periodKey: "strata_admin_period", label: "Strata admin fund" },
  { amountKey: "strata_sinking_amount", periodKey: "strata_sinking_period", label: "Strata sinking fund" },
];
