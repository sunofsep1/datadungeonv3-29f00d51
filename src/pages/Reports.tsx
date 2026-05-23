import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, BarChart3, CalendarClock, Clock, ExternalLink, Home } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportReportButton } from "@/components/performance/ExportReportButton";
import { ListingPipelineFunnelCard } from "@/components/reports/ListingPipelineFunnelCard";
import { ReportsSnapshotCards } from "@/components/reports/ReportsSnapshotCards";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { useListings } from "@/hooks/useListings";
import { buildReportsSnapshot } from "@/lib/reportsSnapshot";
import {
  buildAgencyExpiryReport,
  buildDaysOnMarketReport,
  buildPipelineMonitor,
  buildUpcomingSettlementsReport,
  daysInPipelineStage,
  formatReportDate,
  pipelineStageLabel,
  reportPublicPrice,
  reportSearchPrice,
  type ListingReportRow,
} from "@/lib/listingReports";
import { domToneClasses } from "@/lib/listingCampaignDashboard";
import { cn } from "@/lib/utils";

type ReportTab = "pipeline" | "dom" | "expiry" | "settlements";

const REPORT_TABS: { id: ReportTab; label: string; icon: typeof BarChart3 }[] = [
  { id: "pipeline", label: "Pipeline monitor", icon: BarChart3 },
  { id: "dom", label: "Days on market", icon: Clock },
  { id: "expiry", label: "Agency expiry", icon: CalendarClock },
  { id: "settlements", label: "Upcoming settlements", icon: Home },
];

function ReportTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {headers.map((h) => (
              <th key={h} className="pb-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {cells.map((cell, j) => (
                <td key={j} className="py-2.5 pr-4 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingAddressLink({ listing }: { listing: ListingReportRow }) {
  return (
    <Link to={`/listings/${listing.id}`} className="font-medium text-primary hover:underline line-clamp-2">
      {listing.address}
    </Link>
  );
}

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ReportTab =
    tabParam === "dom" || tabParam === "expiry" || tabParam === "settlements"
      ? tabParam
      : "pipeline";
  const [expiryWindow, setExpiryWindow] = useState(90);
  const [settlementWindow, setSettlementWindow] = useState(60);

  const { data: listings = [], isLoading } = useListings();
  const { commissionRate } = useCommissionRate();

  const reportRows = listings as ListingReportRow[];

  const snapshot = useMemo(
    () => buildReportsSnapshot(reportRows, commissionRate),
    [reportRows, commissionRate],
  );

  const pipeline = useMemo(() => buildPipelineMonitor(reportRows), [reportRows]);
  const domRows = useMemo(() => buildDaysOnMarketReport(reportRows), [reportRows]);
  const expiryRows = useMemo(
    () => buildAgencyExpiryReport(reportRows, { withinDays: expiryWindow, includeExpired: true }),
    [reportRows, expiryWindow],
  );
  const settlementRows = useMemo(
    () => buildUpcomingSettlementsReport(reportRows, { withinDays: settlementWindow, includePast: true }),
    [reportRows, settlementWindow],
  );

  const totalActive = useMemo(
    () => pipeline.filter((p) => p.stage !== "past_client").reduce((n, p) => n + p.count, 0),
    [pipeline],
  );

  const setTab = (tab: ReportTab) => {
    setSearchParams(tab === "pipeline" ? {} : { tab });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" />

      {!isLoading ? (
        <ReportsSnapshotCards snapshot={snapshot} activeTab={activeTab} onSelectTab={(t) => setTab(t as ReportTab)} />
      ) : null}

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as ReportTab)}>
        <TabsList className="flex-wrap h-auto">
          {REPORT_TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="gap-1.5 text-xs sm:text-sm">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4 mt-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <ListingPipelineFunnelCard
                listings={reportRows}
                commissionRate={commissionRate}
                variant="reports"
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {pipeline.map(({ stage, label, count }) => (
                  <Card key={stage} className="zoho-card p-3 border-border">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium truncate">
                      {label}
                    </p>
                    <p className="text-2xl font-bold tabular-nums mt-1">{count}</p>
                  </Card>
                ))}
              </div>

              <Card className="zoho-card p-4 border-border">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold">Pipeline monitor</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {totalActive} active listing{totalActive === 1 ? "" : "s"} across all stages
                    </p>
                  </div>
                  <ExportReportButton
                    filename="pipeline-monitor"
                    columns={[
                      { key: "address", label: "Address" },
                      { key: "stage", label: "Stage" },
                      { key: "days_in_stage", label: "Days in stage" },
                      { key: "search_price", label: "Search price" },
                      { key: "display_price", label: "Display price" },
                      { key: "status", label: "Status" },
                    ]}
                    data={reportRows.map((l) => ({
                      address: l.address,
                      stage: pipelineStageLabel(l.pipeline_stage),
                      days_in_stage: daysInPipelineStage(l),
                      search_price: reportSearchPrice(l),
                      display_price: reportPublicPrice(l),
                      status: l.status ?? "—",
                    }))}
                  />
                </div>
                <ReportTable
                  headers={["Address", "Stage", "Days in stage", "Price", "Status", ""]}
                  emptyMessage="No listings yet."
                  rows={reportRows.map((listing) => [
                    <ListingAddressLink key="addr" listing={listing} />,
                    <Badge key="stage" variant="secondary" className="font-normal">
                      {pipelineStageLabel(listing.pipeline_stage)}
                    </Badge>,
                    <span key="dis" className="tabular-nums">
                      {daysInPipelineStage(listing)}d
                    </span>,
                    <span key="price" className="tabular-nums whitespace-nowrap">
                      {reportPublicPrice(listing)}
                    </span>,
                    <span key="status" className="text-muted-foreground capitalize">
                      {listing.status ?? "—"}
                    </span>,
                    <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link to={`/listings/${listing.id}`} aria-label="Open listing">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>,
                  ])}
                />
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="dom" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Days on market</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Listed campaigns sorted by time on market — stale listings surface first
                </p>
              </div>
              <ExportReportButton
                filename="days-on-market"
                columns={[
                  { key: "address", label: "Address" },
                  { key: "listed", label: "Listed date" },
                  { key: "dom", label: "Days on market" },
                  { key: "enquiries", label: "Enquiries" },
                  { key: "inspections", label: "Inspections" },
                  { key: "offers", label: "Offers" },
                  { key: "price", label: "Display price" },
                ]}
                data={domRows.map((r) => ({
                  address: r.address,
                  listed: formatReportDate(r.listedDate),
                  dom: r.domDays,
                  enquiries: r.campaign_enquiry_count ?? 0,
                  inspections: r.campaign_inspection_count ?? 0,
                  offers: r.campaign_offers_count ?? 0,
                  price: reportPublicPrice(r),
                }))}
              />
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ReportTable
                headers={["Address", "Listed", "DOM", "Enquiries", "Inspections", "Offers", "Price"]}
                emptyMessage="No on-market listings with a listed date."
                rows={domRows.map((row) => {
                  const domStyles = domToneClasses(row.domDays);
                  return [
                    <ListingAddressLink key="addr" listing={row} />,
                    <span key="listed" className="whitespace-nowrap">
                      {formatReportDate(row.listedDate)}
                    </span>,
                    <Badge
                      key="dom"
                      variant="outline"
                      className={cn("tabular-nums font-semibold", domStyles.text, domStyles.border)}
                    >
                      {row.domDays}d
                    </Badge>,
                    <span key="enq" className="tabular-nums">
                      {row.campaign_enquiry_count ?? 0}
                    </span>,
                    <span key="insp" className="tabular-nums">
                      {row.campaign_inspection_count ?? 0}
                    </span>,
                    <span key="off" className="tabular-nums">
                      {row.campaign_offers_count ?? 0}
                    </span>,
                    <span key="price" className="tabular-nums whitespace-nowrap">
                      {reportPublicPrice(row)}
                    </span>,
                  ];
                })}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="expiry" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Agency expiry</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Listings with authority expiring in the next {expiryWindow} days (or already expired)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[30, 60, 90].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={expiryWindow === days ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setExpiryWindow(days)}
                  >
                    {days}d
                  </Button>
                ))}
                <ExportReportButton
                  filename="agency-expiry"
                  columns={[
                    { key: "address", label: "Address" },
                    { key: "expiry", label: "Agency expiry" },
                    { key: "days_until", label: "Days until expiry" },
                    { key: "stage", label: "Stage" },
                    { key: "price", label: "Display price" },
                  ]}
                  data={expiryRows.map((r) => ({
                    address: r.address,
                    expiry: formatReportDate(r.expiryDate),
                    days_until: r.daysUntil,
                    stage: pipelineStageLabel(r.pipeline_stage),
                    price: reportPublicPrice(r),
                  }))}
                />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : expiryRows.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  No listings with agency expiry dates in this window.
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Set <strong className="font-medium text-foreground">Agency expiry</strong> on listing key dates
                  to populate this report.
                </p>
              </div>
            ) : (
              <ReportTable
                headers={["Address", "Expiry", "Days left", "Stage", "Price", ""]}
                emptyMessage="No expiring authorities."
                rows={expiryRows.map((row) => {
                  const urgent = row.daysUntil <= 14;
                  const expired = row.daysUntil < 0;
                  return [
                    <ListingAddressLink key="addr" listing={row} />,
                    <span key="exp" className="whitespace-nowrap">
                      {formatReportDate(row.expiryDate)}
                    </span>,
                    <Badge
                      key="days"
                      variant="outline"
                      className={cn(
                        "tabular-nums gap-1",
                        expired && "border-red-500/40 text-red-400",
                        urgent && !expired && "border-amber-500/40 text-amber-400",
                      )}
                    >
                      {expired ? (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          Expired {Math.abs(row.daysUntil)}d ago
                        </>
                      ) : (
                        `${row.daysUntil}d`
                      )}
                    </Badge>,
                    <Badge key="stage" variant="secondary" className="font-normal">
                      {pipelineStageLabel(row.pipeline_stage)}
                    </Badge>,
                    <span key="price" className="tabular-nums whitespace-nowrap">
                      {reportPublicPrice(row)}
                    </span>,
                    <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link to={`/listings/${row.id}`} aria-label="Open listing">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>,
                  ];
                })}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Upcoming settlements</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Under contract / unconditional listings settling in the next {settlementWindow} days
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[30, 60, 90].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={settlementWindow === days ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setSettlementWindow(days)}
                  >
                    {days}d
                  </Button>
                ))}
                <ExportReportButton
                  filename="upcoming-settlements"
                  columns={[
                    { key: "address", label: "Address" },
                    { key: "settlement", label: "Settlement date" },
                    { key: "days_until", label: "Days until" },
                    { key: "stage", label: "Stage" },
                    { key: "price", label: "Display price" },
                  ]}
                  data={settlementRows.map((r) => ({
                    address: r.address,
                    settlement: formatReportDate(r.settlementDate),
                    days_until: r.daysUntil,
                    stage: pipelineStageLabel(r.pipeline_stage),
                    price: reportPublicPrice(r),
                  }))}
                />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : settlementRows.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm text-muted-foreground">No upcoming settlements in this window.</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Set settlement dates on listing key dates when a sale goes under contract.
                </p>
              </div>
            ) : (
              <ReportTable
                headers={["Address", "Settlement", "Days left", "Stage", "Price", ""]}
                emptyMessage="No settlements due."
                rows={settlementRows.map((row) => {
                  const overdue = row.daysUntil < 0;
                  const soon = row.daysUntil <= 14 && row.daysUntil >= 0;
                  return [
                    <ListingAddressLink key="addr" listing={row} />,
                    <span key="set" className="whitespace-nowrap">
                      {formatReportDate(row.settlementDate)}
                    </span>,
                    <Badge
                      key="days"
                      variant="outline"
                      className={cn(
                        "tabular-nums",
                        overdue && "border-red-500/40 text-red-400",
                        soon && "border-amber-500/40 text-amber-400",
                      )}
                    >
                      {overdue ? `${Math.abs(row.daysUntil)}d overdue` : `${row.daysUntil}d`}
                    </Badge>,
                    <Badge key="stage" variant="secondary" className="font-normal">
                      {pipelineStageLabel(row.pipeline_stage)}
                    </Badge>,
                    <span key="price" className="tabular-nums whitespace-nowrap">
                      {reportPublicPrice(row)}
                    </span>,
                    <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link to={`/listings/${row.id}`} aria-label="Open listing">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>,
                  ];
                })}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
