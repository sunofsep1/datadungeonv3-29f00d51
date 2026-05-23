import { buildListingPipelineFunnel } from "@/lib/listingPipelineFunnel";
import {
  buildAgencyExpiryReport,
  buildDaysOnMarketReport,
  buildUpcomingSettlementsReport,
  type ListingReportRow,
} from "@/lib/listingReports";

export type ReportsSnapshot = {
  pipelineCount: number;
  pipelineValue: number;
  pipelineGci: number;
  expiringWithin30: number;
  expiredAuthorities: number;
  domOver60: number;
  settlementsWithin30: number;
  overdueSettlements: number;
};

export function buildReportsSnapshot(
  listings: ListingReportRow[],
  commissionRatePct: number,
  asOf: Date = new Date(),
): ReportsSnapshot {
  const funnel = buildListingPipelineFunnel(listings, commissionRatePct);
  const expiry = buildAgencyExpiryReport(listings, { withinDays: 30, includeExpired: true }, asOf);
  const dom = buildDaysOnMarketReport(listings, asOf);
  const settlements = buildUpcomingSettlementsReport(
    listings,
    { withinDays: 30, includePast: true },
    asOf,
  );

  return {
    pipelineCount: funnel.totals.count,
    pipelineValue: funnel.totals.totalValue,
    pipelineGci: funnel.totals.projectedGci,
    expiringWithin30: expiry.filter((r) => r.daysUntil >= 0).length,
    expiredAuthorities: expiry.filter((r) => r.daysUntil < 0).length,
    domOver60: dom.filter((r) => r.domDays >= 60).length,
    settlementsWithin30: settlements.filter((r) => r.daysUntil >= 0).length,
    overdueSettlements: settlements.filter((r) => r.daysUntil < 0).length,
  };
}
