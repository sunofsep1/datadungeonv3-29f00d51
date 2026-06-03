import { differenceInCalendarDays } from "date-fns";

export type ListingVendorCampaignStats = {
  daysOnMarket: number | null;
  openInspectionCount: number;
  attendeeCount: number;
  offerCount: number;
  activeOfferCount: number;
};

type ListingLike = {
  created_at?: string | null;
  pipeline_stage?: string | null;
};

type OfferLike = { status: string };

type InspectionLike = { attendeeCount?: number };

export function buildListingVendorCampaignStats(
  listing: ListingLike,
  offers: OfferLike[],
  inspections: InspectionLike[],
  asOf: Date = new Date(),
): ListingVendorCampaignStats {
  const stage = listing.pipeline_stage ?? "";
  const domAnchor = listing.created_at;
  const daysOnMarket =
    domAnchor && !stage.includes("appraisal")
      ? Math.max(0, differenceInCalendarDays(asOf, new Date(domAnchor)))
      : null;

  const activeOfferCount = offers.filter(
    (o) => !["withdrawn", "rejected"].includes(o.status),
  ).length;

  return {
    daysOnMarket,
    openInspectionCount: inspections.length,
    attendeeCount: inspections.reduce((n, i) => n + (i.attendeeCount ?? 0), 0),
    offerCount: offers.length,
    activeOfferCount,
  };
}
