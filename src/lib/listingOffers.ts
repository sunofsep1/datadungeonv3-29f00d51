/** Offers / contracts workflow (Reapit-style). */

export const LISTING_OFFER_STATUSES = [
  { value: "submitted", label: "Submitted", kind: "offer" as const },
  { value: "countered", label: "Countered", kind: "offer" as const },
  { value: "accepted", label: "Accepted", kind: "offer" as const },
  { value: "rejected", label: "Rejected", kind: "offer" as const },
  { value: "withdrawn", label: "Withdrawn", kind: "offer" as const },
  { value: "conditional", label: "Conditional", kind: "contract" as const },
  { value: "unconditional", label: "Unconditional", kind: "contract" as const },
  { value: "settled", label: "Settled", kind: "contract" as const },
  { value: "fallen_through", label: "Fallen through", kind: "contract" as const },
] as const;

export type ListingOfferStatus = (typeof LISTING_OFFER_STATUSES)[number]["value"];
export type ListingOffersTab = "offers" | "contracts" | "all";

const CONTRACT_STATUSES = new Set<ListingOfferStatus>([
  "conditional",
  "unconditional",
  "settled",
  "fallen_through",
]);

export function offerStatusLabel(status: string): string {
  return LISTING_OFFER_STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, " ");
}

export function isContractStatus(status: string): boolean {
  return CONTRACT_STATUSES.has(status as ListingOfferStatus);
}

export function filterOffersByTab<T extends { status: string }>(
  rows: T[],
  tab: ListingOffersTab,
): T[] {
  if (tab === "all") return rows;
  if (tab === "contracts") return rows.filter((r) => isContractStatus(r.status));
  return rows.filter((r) => !isContractStatus(r.status));
}

/** Next status actions from current state. */
export function offerStatusActions(current: string): { value: ListingOfferStatus; label: string }[] {
  switch (current) {
    case "submitted":
    case "countered":
      return [
        { value: "accepted", label: "Accept" },
        { value: "countered", label: "Mark countered" },
        { value: "rejected", label: "Reject" },
        { value: "withdrawn", label: "Withdraw" },
      ];
    case "accepted":
      return [
        { value: "conditional", label: "Exchange (conditional)" },
        { value: "rejected", label: "Reject" },
        { value: "withdrawn", label: "Withdraw" },
      ];
    case "conditional":
      return [
        { value: "unconditional", label: "Go unconditional" },
        { value: "fallen_through", label: "Fallen through" },
      ];
    case "unconditional":
      return [
        { value: "settled", label: "Mark settled" },
        { value: "fallen_through", label: "Fallen through" },
      ];
    default:
      return [];
  }
}

export function formatOfferPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}
