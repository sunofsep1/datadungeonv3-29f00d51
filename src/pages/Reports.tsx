import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Cake,
  CalendarClock,
  Clock,
  ExternalLink,
  FileSignature,
  Home,
  List,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
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
import { useAllListingOffers } from "@/hooks/useListingOffers";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { useProperties } from "@/hooks/useProperties";
import { useAllListingContactLinks } from "@/hooks/useListingContactLinks";
import { buildReportsSnapshot } from "@/lib/reportsSnapshot";
import {
  buildAgencyExpiryReport,
  buildAppraisalListingContactsReport,
  buildContractConditionsDueReport,
  buildCurrentListingsReport,
  buildListingsSalesSummaryReport,
  buildSalesByRegionReport,
  buildUpcomingUnconditionalReport,
  buildDaysOnMarketReport,
  buildOffersPipelineReport,
  buildPipelineMonitor,
  buildUpcomingSettlementsReport,
  daysInPipelineStage,
  formatReportAud,
  formatReportDate,
  pipelineStageLabel,
  reportPublicPrice,
  reportSearchPrice,
  type ListingReportRow,
} from "@/lib/listingReports";
import { domToneClasses } from "@/lib/listingCampaignDashboard";
import { listingSearchPrice } from "@/lib/listingPriceFields";
import {
  buildAuctionStatusReport,
  buildContactAnniversaryReport,
  buildContactClassStatistics,
  buildContactSourceReport,
  buildContactSuburbBreakdownReport,
  buildContactsCreatedByMonth,
  buildContactUnsubscribedReport,
  buildGciByListingReport,
  buildProspectPropertyContactsReport,
} from "@/lib/contactReports";
import {
  useContactClasses,
  useContactClassAssignmentIndex,
  useContactSubscriptionIndex,
} from "@/hooks/useContactClasses";
import { cn } from "@/lib/utils";

type ReportTab =
  | "pipeline"
  | "dom"
  | "expiry"
  | "settlements"
  | "current"
  | "offers"
  | "sources"
  | "gci"
  | "created"
  | "auctions"
  | "class-stats"
  | "unsubscribed"
  | "suburb"
  | "anniversaries"
  | "property-contacts"
  | "contract-conditions"
  | "unconditional"
  | "sales-region"
  | "sales-summary"
  | "appraisal-contacts";

const REPORT_TABS: { id: ReportTab; label: string; icon: typeof BarChart3 }[] = [
  { id: "pipeline", label: "Pipeline monitor", icon: BarChart3 },
  { id: "current", label: "Current listings", icon: List },
  { id: "gci", label: "GCI by listing", icon: TrendingUp },
  { id: "auctions", label: "Auction status", icon: Home },
  { id: "dom", label: "Days on market", icon: Clock },
  { id: "expiry", label: "Agency expiry", icon: CalendarClock },
  { id: "settlements", label: "Upcoming settlements", icon: Home },
  { id: "offers", label: "Offers & contracts", icon: FileSignature },
  { id: "sources", label: "Contact source", icon: Users },
  { id: "created", label: "Contacts created", icon: Users },
  { id: "class-stats", label: "Contact classes", icon: Users },
  { id: "unsubscribed", label: "Unsubscribed", icon: Users },
  { id: "suburb", label: "Suburb breakdown", icon: MapPin },
  { id: "anniversaries", label: "Anniversaries", icon: Cake },
  { id: "property-contacts", label: "Property contacts", icon: Home },
  { id: "contract-conditions", label: "Contract conditions", icon: FileSignature },
  { id: "unconditional", label: "Unconditional sales", icon: CalendarClock },
  { id: "sales-region", label: "Sales by region", icon: MapPin },
  { id: "sales-summary", label: "Listings & sales", icon: BarChart3 },
  { id: "appraisal-contacts", label: "Appraisal contacts", icon: Users },
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
    tabParam === "dom" ||
    tabParam === "expiry" ||
    tabParam === "settlements" ||
    tabParam === "current" ||
    tabParam === "offers" ||
    tabParam === "sources" ||
    tabParam === "gci" ||
    tabParam === "created" ||
    tabParam === "auctions" ||
    tabParam === "class-stats" ||
    tabParam === "unsubscribed" ||
    tabParam === "suburb" ||
    tabParam === "anniversaries" ||
    tabParam === "property-contacts" ||
    tabParam === "contract-conditions" ||
    tabParam === "unconditional" ||
    tabParam === "sales-region" ||
    tabParam === "sales-summary" ||
    tabParam === "appraisal-contacts"
      ? tabParam
      : "pipeline";
  const [expiryWindow, setExpiryWindow] = useState(90);
  const [settlementWindow, setSettlementWindow] = useState(60);
  const [unconditionalWindow, setUnconditionalWindow] = useState(60);
  const [anniversaryWindow, setAnniversaryWindow] = useState(30);
  const [contractConditionWindow, setContractConditionWindow] = useState(30);

  const { data: listings = [], isLoading } = useListings();
  const { data: properties = [] } = useProperties();
  const { data: allListingContactLinks = [], isLoading: listingLinksLoading } = useAllListingContactLinks();
  const { data: allOffers = [], isLoading: offersLoading } = useAllListingOffers();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: contactClasses = [] } = useContactClasses();
  const { data: classAssignmentIndex = new Map() } = useContactClassAssignmentIndex();
  const { data: subscriptionIndex = new Map() } = useContactSubscriptionIndex();
  const { commissionRate } = useCommissionRate();

  const reportRows = listings as ListingReportRow[];
  const propertyById = useMemo(
    () =>
      new Map(
        properties.map((p) => [
          p.id,
          {
            city: p.city,
            suburb: (p as { suburb?: string | null }).suburb ?? null,
            state: p.state,
          },
        ]),
      ),
    [properties],
  );
  const listingsById = useMemo(() => new Map(reportRows.map((l) => [l.id, l])), [reportRows]);
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

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
  const currentListingRows = useMemo(() => buildCurrentListingsReport(reportRows), [reportRows]);
  const sourceRows = useMemo(
    () => buildContactSourceReport(contacts.map((c) => ({ source: c.source, created_at: c.created_at }))),
    [contacts],
  );
  const gciRows = useMemo(
    () =>
      buildGciByListingReport(
        reportRows.map((l) => ({
          id: l.id,
          address: l.address,
          pipeline_stage: l.pipeline_stage,
          searchPrice: listingSearchPrice(l),
        })),
        commissionRate,
        pipelineStageLabel,
      ),
    [reportRows, commissionRate],
  );
  const contactsCreatedRows = useMemo(
    () => buildContactsCreatedByMonth(contacts.map((c) => ({ source: c.source, created_at: c.created_at }))),
    [contacts],
  );
  const classStatRows = useMemo(() => {
    const assignments: { contact_id: string; class_id: string }[] = [];
    for (const [contact_id, classIds] of classAssignmentIndex) {
      for (const class_id of classIds) {
        assignments.push({ contact_id, class_id });
      }
    }
    return buildContactClassStatistics(contactClasses, assignments);
  }, [contactClasses, classAssignmentIndex]);

  const unsubscribedRows = useMemo(
    () =>
      buildContactUnsubscribedReport(
        contacts.map((c) => ({
          id: c.id,
          name: getContactDisplayName(c),
          email: c.email,
        })),
        subscriptionIndex,
      ),
    [contacts, subscriptionIndex],
  );

  const suburbRows = useMemo(
    () =>
      buildContactSuburbBreakdownReport(
        contacts.map((c) => ({ city: c.city, state: c.state })),
      ),
    [contacts],
  );

  const anniversaryRows = useMemo(
    () =>
      buildContactAnniversaryReport(
        contacts.map((c) => ({
          id: c.id,
          name: getContactDisplayName(c),
          date_of_birth: (c as { date_of_birth?: string | null }).date_of_birth,
        })),
        anniversaryWindow,
      ),
    [contacts, anniversaryWindow],
  );

  const propertyContactRows = useMemo(
    () =>
      buildProspectPropertyContactsReport(
        contacts.map((c) => ({
          id: c.id,
          name: getContactDisplayName(c),
          contact_property_links: c.contact_property_links,
        })),
      ),
    [contacts],
  );

  const unconditionalRows = useMemo(
    () =>
      buildUpcomingUnconditionalReport(reportRows, {
        withinDays: unconditionalWindow,
        includePast: true,
      }),
    [reportRows, unconditionalWindow],
  );

  const salesByRegionRows = useMemo(
    () => buildSalesByRegionReport(reportRows, propertyById),
    [reportRows, propertyById],
  );

  const salesSummaryRows = useMemo(
    () => buildListingsSalesSummaryReport(reportRows, commissionRate),
    [reportRows, commissionRate],
  );

  const appraisalContactRows = useMemo(
    () => buildAppraisalListingContactsReport(allListingContactLinks),
    [allListingContactLinks],
  );

  const contractConditionRows = useMemo(
    () =>
      buildContractConditionsDueReport(
        reportRows.map((l) => {
          const row = l as ListingReportRow & {
            key_date_contract?: string | null;
            contract_finance_days?: number | null;
            contract_building_pest_days?: number | null;
            contract_due_diligence_days?: number | null;
            contract_subject_sale_days?: number | null;
            contract_body_corporate_days?: number | null;
          };
          return {
            id: row.id,
            address: row.address,
            key_date_contract: row.key_date_contract,
            contract_finance_days: row.contract_finance_days,
            contract_building_pest_days: row.contract_building_pest_days,
            contract_due_diligence_days: row.contract_due_diligence_days,
            contract_subject_sale_days: row.contract_subject_sale_days,
            contract_body_corporate_days: row.contract_body_corporate_days,
          };
        }),
        { withinDays: contractConditionWindow, includeOverdue: true },
      ),
    [reportRows, contractConditionWindow],
  );

  const auctionRows = useMemo(
    () =>
      buildAuctionStatusReport(
        reportRows.map((l) => ({
          id: l.id,
          address: l.address,
          pipeline_stage: l.pipeline_stage,
          sale_method: (l as { sale_method?: string | null }).sale_method,
          listed_as_auction: (l as { listed_as_auction?: boolean | null }).listed_as_auction,
          display_price: (l as { display_price?: string | null }).display_price,
          display_price_public: (l as { display_price_public?: string | null }).display_price_public,
        })),
        pipelineStageLabel,
      ),
    [reportRows],
  );
  const offerRows = useMemo(() => {
    const offersForReport = allOffers.map((o) => {
      const c = o.buyer_contact_id ? contactsById.get(o.buyer_contact_id) : null;
      return {
        ...o,
        buyer: c
          ? {
              name: getContactDisplayName(c),
              first_name: c.first_name ?? null,
              last_name: c.last_name ?? null,
            }
          : null,
      };
    });
    return buildOffersPipelineReport(offersForReport, listingsById);
  }, [allOffers, listingsById, contactsById]);

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

        <TabsContent value="current" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">All current listings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active pipeline excluding appraisals and past clients — {currentListingRows.length} listing
                  {currentListingRows.length === 1 ? "" : "s"}
                </p>
              </div>
              <ExportReportButton
                filename="current-listings"
                columns={[
                  { key: "address", label: "Address" },
                  { key: "stage", label: "Stage" },
                  { key: "search_price", label: "Search price" },
                  { key: "display_price", label: "Display price" },
                  { key: "listed", label: "Listed date" },
                  { key: "enquiries", label: "Enquiries" },
                ]}
                data={currentListingRows.map((l) => ({
                  address: l.address,
                  stage: pipelineStageLabel(l.pipeline_stage),
                  search_price: reportSearchPrice(l),
                  display_price: reportPublicPrice(l),
                  listed: formatReportDate(l.key_date_listed ?? l.campaign_start_at ?? l.created_at),
                  enquiries: l.campaign_enquiry_count ?? 0,
                }))}
              />
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ReportTable
                headers={["Address", "Stage", "Search price", "Display", "Listed", "Enquiries", ""]}
                emptyMessage="No active listings."
                rows={currentListingRows.map((listing) => [
                  <ListingAddressLink key="addr" listing={listing} />,
                  <Badge key="stage" variant="secondary" className="font-normal">
                    {pipelineStageLabel(listing.pipeline_stage)}
                  </Badge>,
                  <span key="search" className="tabular-nums whitespace-nowrap">
                    {reportSearchPrice(listing)}
                  </span>,
                  <span key="display" className="tabular-nums whitespace-nowrap">
                    {reportPublicPrice(listing)}
                  </span>,
                  <span key="listed" className="whitespace-nowrap text-muted-foreground">
                    {formatReportDate(listing.key_date_listed ?? listing.campaign_start_at ?? listing.created_at)}
                  </span>,
                  <span key="enq" className="tabular-nums">
                    {listing.campaign_enquiry_count ?? 0}
                  </span>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/listings/${listing.id}`} aria-label="Open listing">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
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

        <TabsContent value="offers" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Offers & contracts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Open offers and contracts across all listings (submitted through unconditional)
                </p>
              </div>
              <ExportReportButton
                filename="offers-pipeline"
                columns={[
                  { key: "ref", label: "Ref" },
                  { key: "listing", label: "Listing" },
                  { key: "buyer", label: "Buyer" },
                  { key: "date", label: "Offer date" },
                  { key: "price", label: "Offer price" },
                  { key: "status", label: "Status" },
                ]}
                data={offerRows.map((r) => ({
                  ref: r.refCode,
                  listing: r.listingAddress,
                  buyer: r.buyerName,
                  date: formatReportDate(r.offerDate),
                  price: formatReportAud(r.offerPrice),
                  status: r.statusLabel,
                }))}
              />
            </div>
            {isLoading || offersLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : offerRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No open offers or contracts. Add offers on a listing detail page.
              </p>
            ) : (
              <ReportTable
                headers={["Ref", "Listing", "Buyer", "Date", "Price", "Status", ""]}
                emptyMessage="No open offers."
                rows={offerRows.map((row) => [
                  <span key="ref" className="font-mono text-xs">
                    {row.refCode}
                  </span>,
                  <Link
                    key="listing"
                    to={`/listings/${row.listingId}`}
                    className="font-medium text-primary hover:underline line-clamp-2"
                  >
                    {row.listingAddress}
                  </Link>,
                  <span key="buyer" className="text-muted-foreground">
                    {row.buyerName}
                  </span>,
                  <span key="date" className="whitespace-nowrap">
                    {formatReportDate(row.offerDate)}
                  </span>,
                  <span key="price" className="tabular-nums font-medium whitespace-nowrap">
                    {formatReportAud(row.offerPrice)}
                  </span>,
                  <Badge key="status" variant="secondary" className="font-normal">
                    {row.statusLabel}
                  </Badge>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/listings/${row.listingId}`} aria-label="Open listing">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="gci" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">GCI by listing</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projected gross commission at {commissionRate}% on internal search price
                </p>
              </div>
              <ExportReportButton
                filename="gci-by-listing"
                columns={[
                  { key: "address", label: "Address" },
                  { key: "stage", label: "Stage" },
                  { key: "search_price", label: "Search price" },
                  { key: "gci", label: "Projected GCI" },
                ]}
                data={gciRows.map((r) => ({
                  address: r.address,
                  stage: r.stage,
                  search_price: formatReportAud(r.searchPrice),
                  gci: formatReportAud(r.projectedGci),
                }))}
              />
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ReportTable
                headers={["Address", "Stage", "Search price", "Projected GCI", ""]}
                emptyMessage="No listings with search price for GCI estimate."
                rows={gciRows.map((row) => [
                  <Link
                    key="addr"
                    to={`/listings/${row.listingId}`}
                    className="font-medium text-primary hover:underline line-clamp-2"
                  >
                    {row.address}
                  </Link>,
                  <Badge key="stage" variant="secondary" className="font-normal">
                    {row.stage}
                  </Badge>,
                  <span key="price" className="tabular-nums whitespace-nowrap">
                    {formatReportAud(row.searchPrice)}
                  </span>,
                  <span key="gci" className="tabular-nums font-semibold whitespace-nowrap">
                    {formatReportAud(row.projectedGci)}
                  </span>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/listings/${row.listingId}`} aria-label="Open listing">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Contact source</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  How contacts entered the database — {contacts.length} total
                </p>
              </div>
              <ExportReportButton
                filename="contact-source"
                columns={[
                  { key: "source", label: "Source" },
                  { key: "count", label: "Contacts" },
                ]}
                data={sourceRows.map((r) => ({ source: r.source, count: r.count }))}
              />
            </div>
            {contactsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ReportTable
                headers={["Source", "Count"]}
                emptyMessage="No contacts yet."
                rows={sourceRows.map((row) => [
                  <span key="src" className="font-medium">
                    {row.source}
                  </span>,
                  <span key="cnt" className="tabular-nums">
                    {row.count}
                  </span>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="created" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Contacts created</h2>
                <p className="text-xs text-muted-foreground mt-0.5">New contacts by month (§9)</p>
              </div>
              <ExportReportButton
                filename="contacts-created"
                columns={[
                  { key: "month", label: "Month" },
                  { key: "count", label: "Contacts" },
                ]}
                data={contactsCreatedRows.map((r) => ({ month: r.label, count: r.count }))}
              />
            </div>
            {contactsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ReportTable
                headers={["Month", "Contacts created"]}
                emptyMessage="No contacts with created dates."
                rows={contactsCreatedRows.map((row) => [
                  <span key="m" className="font-medium">
                    {row.label}
                  </span>,
                  <span key="c" className="tabular-nums">
                    {row.count}
                  </span>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="auctions" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Auction status</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Listings marked auction or listed as auction
                </p>
              </div>
              <ExportReportButton
                filename="auction-status"
                columns={[
                  { key: "address", label: "Address" },
                  { key: "stage", label: "Stage" },
                  { key: "method", label: "Sale method" },
                  { key: "display", label: "Display price" },
                ]}
                data={auctionRows.map((r) => ({
                  address: r.address,
                  stage: r.stage,
                  method: r.saleMethod,
                  display: r.displayPrice,
                }))}
              />
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ReportTable
                headers={["Address", "Stage", "Method", "Display price", ""]}
                emptyMessage="No auction listings in the pipeline."
                rows={auctionRows.map((row) => [
                  <Link
                    key="addr"
                    to={`/listings/${row.listingId}`}
                    className="font-medium text-primary hover:underline line-clamp-2"
                  >
                    {row.address}
                  </Link>,
                  <Badge key="stage" variant="secondary" className="font-normal">
                    {row.stage}
                  </Badge>,
                  <span key="method" className="text-sm capitalize">
                    {row.saleMethod}
                  </span>,
                  <span key="disp" className="text-sm">
                    {row.displayPrice}
                  </span>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/listings/${row.listingId}`} aria-label="Open listing">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="class-stats" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Contact class statistics</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Contacts per Reapit-style segment (§9)</p>
              </div>
              <ExportReportButton
                filename="contact-class-stats"
                columns={[
                  { key: "class", label: "Class" },
                  { key: "count", label: "Contacts" },
                ]}
                data={classStatRows.map((r) => ({ class: r.className, count: r.contactCount }))}
              />
            </div>
            {classStatRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No class assignments yet. Add classes on contact cards.
              </p>
            ) : (
              <ReportTable
                headers={["Class", "Contacts"]}
                emptyMessage="No data"
                rows={classStatRows.map((row) => [
                  <span key="n" className="font-medium">
                    {row.className}
                  </span>,
                  <span key="c" className="tabular-nums">
                    {row.contactCount}
                  </span>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="unsubscribed" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Contact unsubscribed</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contacts who opted out of one or more subscription types (§9)
                </p>
              </div>
              <ExportReportButton
                filename="contact-unsubscribed"
                columns={[
                  { key: "name", label: "Contact" },
                  { key: "email", label: "Email" },
                  { key: "kinds", label: "Unsubscribed from" },
                ]}
                data={unsubscribedRows.map((r) => ({
                  name: r.name,
                  email: r.email,
                  kinds: r.unsubscribedKinds.join("; "),
                }))}
              />
            </div>
            {contactsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ReportTable
                headers={["Contact", "Email", "Unsubscribed from", ""]}
                emptyMessage="No explicit subscription opt-outs recorded."
                rows={unsubscribedRows.map((row) => [
                  <Link
                    key="n"
                    to={`/contacts/${row.contactId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.name}
                  </Link>,
                  <span key="e" className="text-sm">
                    {row.email}
                  </span>,
                  <span key="k" className="text-sm text-muted-foreground">
                    {row.unsubscribedKinds.join(" · ")}
                  </span>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/contacts/${row.contactId}`} aria-label="Open contact">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="suburb" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Contact suburb breakdown</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Contacts by suburb/city and state (§9)</p>
              </div>
              <ExportReportButton
                filename="contact-suburb-breakdown"
                columns={[
                  { key: "suburb", label: "Suburb" },
                  { key: "count", label: "Contacts" },
                ]}
                data={suburbRows.map((r) => ({ suburb: r.suburbKey, count: r.count }))}
              />
            </div>
            {contactsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ReportTable
                headers={["Suburb", "Contacts"]}
                emptyMessage="No contacts with suburb data."
                rows={suburbRows.map((row) => [
                  <span key="s" className="font-medium">
                    {row.suburbKey}
                  </span>,
                  <span key="c" className="tabular-nums">
                    {row.count}
                  </span>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="anniversaries" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Contact anniversaries</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upcoming birthdays in the next {anniversaryWindow} days (§9)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[14, 30, 60].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    size="sm"
                    variant={anniversaryWindow === days ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setAnniversaryWindow(days)}
                  >
                    {days}d
                  </Button>
                ))}
                <ExportReportButton
                  filename="contact-anniversaries"
                  columns={[
                    { key: "name", label: "Contact" },
                    { key: "dob", label: "Date of birth" },
                    { key: "next", label: "Next" },
                    { key: "days", label: "Days until" },
                  ]}
                  data={anniversaryRows.map((r) => ({
                    name: r.name,
                    dob: r.dateOfBirth,
                    next: r.nextOccurrenceLabel,
                    days: r.daysUntil,
                  }))}
                />
              </div>
            </div>
            {contactsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ReportTable
                headers={["Contact", "DOB", "Next", "Days", ""]}
                emptyMessage="No birthdays in this window — add date of birth on contacts."
                rows={anniversaryRows.map((row) => [
                  <Link
                    key="n"
                    to={`/contacts/${row.contactId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.name}
                  </Link>,
                  <span key="d" className="text-sm tabular-nums">
                    {row.dateOfBirth}
                  </span>,
                  <span key="nx" className="text-sm">
                    {row.nextOccurrenceLabel}
                  </span>,
                  <Badge
                    key="days"
                    variant={row.daysUntil === 0 ? "default" : "secondary"}
                    className="font-normal tabular-nums"
                  >
                    {row.daysUntil === 0 ? "Today" : `${row.daysUntil}d`}
                  </Badge>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/contacts/${row.contactId}`} aria-label="Open contact">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="property-contacts" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Prospect property contacts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contacts linked to properties in your database (§9)
                </p>
              </div>
              <ExportReportButton
                filename="prospect-property-contacts"
                columns={[
                  { key: "name", label: "Contact" },
                  { key: "count", label: "Properties" },
                  { key: "roles", label: "Roles" },
                  { key: "sample", label: "Sample address" },
                ]}
                data={propertyContactRows.map((r) => ({
                  name: r.name,
                  count: r.propertyCount,
                  roles: r.roles,
                  sample: r.sampleAddress,
                }))}
              />
            </div>
            {contactsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ReportTable
                headers={["Contact", "Properties", "Roles", "Sample address", ""]}
                emptyMessage="No contacts linked to properties yet."
                rows={propertyContactRows.map((row) => [
                  <Link
                    key="n"
                    to={`/contacts/${row.contactId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.name}
                  </Link>,
                  <span key="c" className="tabular-nums">
                    {row.propertyCount}
                  </span>,
                  <span key="r" className="text-sm text-muted-foreground capitalize">
                    {row.roles}
                  </span>,
                  <span key="a" className="text-sm line-clamp-2">
                    {row.sampleAddress}
                  </span>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/contacts/${row.contactId}`} aria-label="Open contact">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="contract-conditions" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Contract conditions due</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  QLD-style buyer conditions from contract date + day counts (§9)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[14, 30, 60].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    size="sm"
                    variant={contractConditionWindow === days ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setContractConditionWindow(days)}
                  >
                    {days}d
                  </Button>
                ))}
                <ExportReportButton
                  filename="contract-conditions-due"
                  columns={[
                    { key: "address", label: "Listing" },
                    { key: "condition", label: "Condition" },
                    { key: "due", label: "Due" },
                    { key: "days", label: "Days until" },
                    { key: "contract", label: "Contract date" },
                  ]}
                  data={contractConditionRows.map((r) => ({
                    address: r.address,
                    condition: r.conditionLabel,
                    due: r.dueDateLabel,
                    days: r.daysUntil,
                    contract: r.contractDateLabel,
                  }))}
                />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ReportTable
                headers={["Listing", "Condition", "Due", "Days", "Contract", ""]}
                emptyMessage="No conditions due — set contract date and condition days on listings under contract."
                rows={contractConditionRows.map((row) => [
                  <Link
                    key="a"
                    to={`/listings/${row.listingId}`}
                    className="font-medium text-primary hover:underline line-clamp-2"
                  >
                    {row.address}
                  </Link>,
                  <span key="c" className="text-sm">
                    {row.conditionLabel}
                  </span>,
                  <span key="d" className="text-sm tabular-nums">
                    {row.dueDateLabel}
                  </span>,
                  <Badge
                    key="days"
                    variant={row.daysUntil < 0 ? "destructive" : row.daysUntil <= 3 ? "default" : "secondary"}
                    className="font-normal tabular-nums"
                  >
                    {row.daysUntil < 0 ? `${Math.abs(row.daysUntil)}d overdue` : `${row.daysUntil}d`}
                  </Badge>,
                  <span key="cd" className="text-sm text-muted-foreground">
                    {row.contractDateLabel}
                  </span>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/listings/${row.listingId}`} aria-label="Open listing">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="unconditional" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Upcoming unconditional sales</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Unconditional listings with settlement dates (§9)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[30, 60, 90].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    size="sm"
                    variant={unconditionalWindow === days ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setUnconditionalWindow(days)}
                  >
                    {days}d
                  </Button>
                ))}
                <ExportReportButton
                  filename="upcoming-unconditional"
                  columns={[
                    { key: "address", label: "Listing" },
                    { key: "settlement", label: "Settlement" },
                    { key: "days", label: "Days until" },
                    { key: "price", label: "Search price" },
                  ]}
                  data={unconditionalRows.map((r) => ({
                    address: r.address,
                    settlement: formatReportDate(r.settlementDate),
                    days: r.daysUntil,
                    price: reportSearchPrice(r),
                  }))}
                />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ReportTable
                headers={["Listing", "Settlement", "Days", "Search price", ""]}
                emptyMessage="No unconditional listings with settlement dates in this window."
                rows={unconditionalRows.map((row) => [
                  <Link
                    key="a"
                    to={`/listings/${row.id}`}
                    className="font-medium text-primary hover:underline line-clamp-2"
                  >
                    {row.address}
                  </Link>,
                  <span key="s" className="text-sm">
                    {formatReportDate(row.settlementDate)}
                  </span>,
                  <Badge
                    key="d"
                    variant={row.daysUntil < 0 ? "destructive" : "secondary"}
                    className="font-normal tabular-nums"
                  >
                    {row.daysUntil < 0 ? `${Math.abs(row.daysUntil)}d overdue` : `${row.daysUntil}d`}
                  </Badge>,
                  <span key="p" className="text-sm tabular-nums">
                    {reportSearchPrice(row)}
                  </span>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/listings/${row.id}`} aria-label="Open listing">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="sales-region" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Sales by region</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Settled and past-client listings by suburb (§9)
                </p>
              </div>
              <ExportReportButton
                filename="sales-by-region"
                columns={[
                  { key: "region", label: "Region" },
                  { key: "sales", label: "Sales" },
                  { key: "value", label: "Total value" },
                ]}
                data={salesByRegionRows.map((r) => ({
                  region: r.region,
                  sales: r.saleCount,
                  value: r.totalValue,
                }))}
              />
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ReportTable
                headers={["Region", "Sales", "Total value"]}
                emptyMessage="No settled sales to group by region."
                rows={salesByRegionRows.map((row) => [
                  <span key="r" className="font-medium">
                    {row.region}
                  </span>,
                  <span key="c" className="tabular-nums">
                    {row.saleCount}
                  </span>,
                  <span key="v" className="tabular-nums">
                    {formatReportAud(row.totalValue)}
                  </span>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="sales-summary" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Listings & sales summary</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Count, value, and projected GCI by pipeline stage (§9)
                </p>
              </div>
              <ExportReportButton
                filename="listings-sales-summary"
                columns={[
                  { key: "stage", label: "Stage" },
                  { key: "count", label: "Count" },
                  { key: "value", label: "Total value" },
                  { key: "gci", label: "Projected GCI" },
                ]}
                data={salesSummaryRows.map((r) => ({
                  stage: r.label,
                  count: r.count,
                  value: r.totalValue,
                  gci: r.projectedGci,
                }))}
              />
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ReportTable
                headers={["Stage", "Count", "Total value", "Projected GCI"]}
                emptyMessage="No listings in pipeline."
                rows={salesSummaryRows.map((row) => [
                  <span key="s" className="font-medium">
                    {row.label}
                  </span>,
                  <span key="c" className="tabular-nums">
                    {row.count}
                  </span>,
                  <span key="v" className="tabular-nums">
                    {formatReportAud(row.totalValue)}
                  </span>,
                  <span key="g" className="tabular-nums">
                    {formatReportAud(row.projectedGci)}
                  </span>,
                ])}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="appraisal-contacts" className="space-y-4 mt-4">
          <Card className="zoho-card p-4 border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold">Appraisal & listing contacts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contacts linked to appraisal or listed stock (§9)
                </p>
              </div>
              <ExportReportButton
                filename="appraisal-listing-contacts"
                columns={[
                  { key: "contact", label: "Contact" },
                  { key: "listing", label: "Listing" },
                  { key: "stage", label: "Stage" },
                  { key: "role", label: "Role" },
                ]}
                data={appraisalContactRows.map((r) => ({
                  contact: r.contactName,
                  listing: r.listingAddress,
                  stage: r.stage,
                  role: r.role,
                }))}
              />
            </div>
            {listingLinksLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ReportTable
                headers={["Contact", "Listing", "Stage", "Role", ""]}
                emptyMessage="No contacts linked to appraisal or listing-stage properties."
                rows={appraisalContactRows.map((row) => [
                  <Link
                    key="c"
                    to={`/contacts/${row.contactId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.contactName}
                  </Link>,
                  <Link
                    key="l"
                    to={`/listings/${row.listingId}`}
                    className="text-sm text-primary hover:underline line-clamp-2"
                  >
                    {row.listingAddress}
                  </Link>,
                  <Badge key="st" variant="secondary" className="font-normal">
                    {row.stage}
                  </Badge>,
                  <span key="r" className="text-sm capitalize text-muted-foreground">
                    {row.role}
                  </span>,
                  <Button key="open" variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/listings/${row.listingId}`} aria-label="Open listing">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>,
                ])}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
