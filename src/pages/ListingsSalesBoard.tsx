import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  GripVertical,
  Home,
  DollarSign,
  User,
  Clock,
  AlertTriangle,
  Layers,
  CircleDollarSign,
  CheckCircle2,
  TrendingUp,
  Percent,
  ClipboardList,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useListings, useUpdateListing, type Listing, type ListingWithContact } from "@/hooks/useListings";
import { useContacts } from "@/hooks/useContacts";
import { useLogListingStageMove } from "@/hooks/useEvents";
import { differenceInCalendarDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { listingKanbanColumnId } from "@/lib/listingKanbanStages";
import { AddListingDialog } from "@/components/listings/AddListingDialog";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { Skeleton } from "@/components/ui/skeleton";

const ListingsTable = lazy(() => import("./Listings"));

/**
 * Kanban columns for your listings / sales pipeline.
 * `pipeline_stage` slugs align with listing updates + journey sync (see leadCategoryDerivation).
 */
const SALES_KANBAN_STAGES = [
  { id: "appraisal", name: "Appraisal / prep", color: "bg-blue-500" },
  { id: "listing", name: "Listed", color: "bg-cyan-500" },
  { id: "under_contract", name: "Under contract", color: "bg-purple-500" },
  { id: "unconditional", name: "Unconditional", color: "bg-amber-500" },
  { id: "settled", name: "Settled", color: "bg-green-500" },
  { id: "past_client", name: "Past client", color: "bg-slate-500" },
] as const;

const STAGE_WARNINGS: Record<string, number> = {
  appraisal: 21,
  listing: 45,
  under_contract: 45,
  unconditional: 21,
  settled: Infinity,
  past_client: Infinity,
};

export default function ListingsSalesBoard() {
  const { data: listings = [], isLoading } = useListings();
  const { data: contacts = [] } = useContacts();
  const { commissionRate } = useCommissionRate();
  const updateListing = useUpdateListing();
  const { logStageMove } = useLogListingStageMove();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Listing | null>(null);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const showTable = searchParams.get("view") === "table";

  const setShowTable = (table: boolean) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (table) next.set("view", "table");
        else next.delete("view");
        return next;
      },
      { replace: true }
    );
  };

  const contactMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    contacts.forEach((c) => map.set(c.id, { id: c.id, name: c.name ?? "Contact" }));
    return map;
  }, [contacts]);

  const getListingsByColumn = (columnId: string) =>
    listings.filter((l) => listingKanbanColumnId(l.pipeline_stage) === columnId);

  const handleDragStart = (e: React.DragEvent, listing: Listing) => {
    setDraggedItem(listing);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedItem || listingKanbanColumnId(draggedItem.pipeline_stage) === columnId) {
      setDraggedItem(null);
      return;
    }
    const oldStage = draggedItem.pipeline_stage || "appraisal";
    const label = SALES_KANBAN_STAGES.find((s) => s.id === columnId)?.name || columnId;
    try {
      await updateListing.mutateAsync({
        id: draggedItem.id,
        pipeline_stage: columnId,
        previous_pipeline_stage: oldStage,
      });
      try {
        await logStageMove(draggedItem.id, draggedItem.contact_id, oldStage, columnId, draggedItem.address);
      } catch {
        /* activity optional */
      }
      toast({ title: "Stage updated", description: `Moved to ${label}` });
    } catch {
      toast({ title: "Error", description: "Failed to update stage", variant: "destructive" });
    }
    setDraggedItem(null);
  };

  const getDaysInStage = (listing: Listing): number => {
    if (!listing.updated_at) return 0;
    return Math.max(0, differenceInCalendarDays(new Date(), new Date(listing.updated_at)));
  };

  const getDaysOnMarket = (listing: Listing): number | null => {
    const column = listingKanbanColumnId(listing.pipeline_stage);
    if (column === "appraisal" || column === "past_client") return null;
    const anchor = listing.created_at || listing.updated_at;
    if (!anchor) return null;
    return Math.max(0, differenceInCalendarDays(new Date(), new Date(anchor)));
  };

  const getStageWarning = (listing: Listing): "none" | "warning" | "critical" => {
    const col = listingKanbanColumnId(listing.pipeline_stage);
    const days = getDaysInStage(listing);
    const threshold = STAGE_WARNINGS[col] ?? 30;
    if (days > threshold * 1.5) return "critical";
    if (days > threshold) return "warning";
    return "none";
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
  };

  const formatCompactCurrency = (n: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" }).format(n);

  const kpi = useMemo(() => {
    const dealRows = listings.filter((l) => l.status !== "withdrawn");
    const sumPrice = (rows: Listing[]) => rows.reduce((s, l) => s + (Number(l.price) || 0), 0);

    const col = (l: Listing) => listingKanbanColumnId(l.pipeline_stage);
    const activePipeline = dealRows.filter((l) => {
      const c = col(l);
      return c === "appraisal" || c === "listing" || c === "under_contract" || c === "unconditional";
    });
    const onMarket = dealRows.filter((l) => col(l) === "listing");
    const inContract = dealRows.filter((l) => col(l) === "under_contract" || col(l) === "unconditional");
    const closed = dealRows.filter((l) => col(l) === "settled" || col(l) === "past_client");

    const priced = dealRows.filter((l) => l.price != null && Number(l.price) > 0);
    const avgGuide = priced.length ? sumPrice(priced) / priced.length : 0;
    const settlementRate = dealRows.length ? (closed.length / dealRows.length) * 100 : 0;

    return {
      totalDeals: dealRows.length,
      onMarketCount: onMarket.length,
      pipelineCount: activePipeline.length,
      inContractCount: inContract.length,
      closedCount: closed.length,
      pipelineValue: sumPrice(activePipeline),
      closedValue: sumPrice(closed),
      totalValue: sumPrice(dealRows),
      avgGuide,
      settlementRate,
      projectedGci: (sumPrice(activePipeline) * commissionRate) / 100,
    };
  }, [listings, commissionRate]);

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader
        title="Listings & Sales"
        description="Pipeline board for stages, or table view for filters, export, and bulk actions."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              className="flex rounded-lg border border-border bg-muted/50 p-0.5"
              role="group"
              aria-label="Listings view"
            >
              <button
                type="button"
                aria-label="Pipeline board"
                aria-pressed={!showTable}
                onClick={() => setShowTable(false)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  !showTable ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Table view"
                aria-pressed={showTable}
                onClick={() => setShowTable(true)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  showTable ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add listing
            </Button>
          </div>
        }
      />

      {showTable ? (
        <Suspense
          fallback={
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-10 w-full max-w-md rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          }
        >
          <ListingsTable embedded />
        </Suspense>
      ) : null}

      {!showTable && listings.length > 0 && (
        <section className="mb-6" aria-label="Pipeline KPIs">
          <h2 className="text-sm font-semibold text-foreground mb-3">Performance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <Card className="zoho-card p-4 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Layers className="w-3.5 h-3.5" />
                Active pipeline
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.pipelineCount}</p>
            </Card>
            <Card className="zoho-card p-4 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                On market
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.onMarketCount}</p>
            </Card>
            <Card className="zoho-card p-4 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                Under contract
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.inContractCount}</p>
            </Card>
            <Card className="zoho-card p-4 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                Pipeline value
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">
                {formatCompactCurrency(kpi.pipelineValue)}
              </p>
            </Card>
            <Card className="zoho-card p-4 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Percent className="w-3.5 h-3.5" />
                Projected GCI ({commissionRate.toFixed(1)}%)
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">
                {formatCompactCurrency(kpi.projectedGci)}
              </p>
            </Card>
            <Card className="zoho-card p-4 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settled
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.closedCount}</p>
            </Card>
            <Card className="zoho-card p-4 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <CircleDollarSign className="w-3.5 h-3.5" />
                Sales volume
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">
                {formatCompactCurrency(kpi.closedValue)}
              </p>
            </Card>
            <Card className="zoho-card p-4 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Percent className="w-3.5 h-3.5" />
                Settled rate
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {kpi.totalDeals ? `${Math.round(kpi.settlementRate)}%` : "—"}
              </p>
            </Card>
            <Card className="zoho-card p-4 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Home className="w-3.5 h-3.5" />
                Total deals
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.totalDeals}</p>
            </Card>
            <Card className="zoho-card p-4 border-border col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                Portfolio value
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">
                {formatCurrency(kpi.totalValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                Avg guide {kpi.avgGuide ? formatCurrency(Math.round(kpi.avgGuide)) : "—"}
              </p>
            </Card>
          </div>
        </section>
      )}

      {!showTable ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 overflow-x-auto pb-4">
        {SALES_KANBAN_STAGES.map((stage) => {
          const stageListings = getListingsByColumn(stage.id);
          const stageValue = stageListings.reduce((sum, l) => sum + (l.price || 0), 0);
          return (
            <div
              key={stage.id}
              className="flex min-h-0 min-w-[200px] flex-col rounded-lg border border-border bg-muted/20"
              onDragOver={handleDragOver}
              onDrop={(ev) => void handleDrop(ev, stage.id)}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-background/80 px-3 py-2 rounded-t-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", stage.color)} />
                  <span className="font-medium text-foreground text-sm truncate">{stage.name}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{stageListings.length}</span>
              </div>
              <div className="shrink-0 border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
                {formatCurrency(stageValue)}
              </div>
              <div className="min-h-[min(7rem,22vh)] max-h-[calc(100vh-12rem)] space-y-2 overflow-y-auto overscroll-y-contain p-2 [scrollbar-gutter:stable]">
                {stageListings.map((listing) => {
                  const contact =
                    (listing as ListingWithContact).contacts ||
                    (listing.contact_id ? contactMap.get(listing.contact_id) : null);
                  const daysInStage = getDaysInStage(listing);
                  const daysOnMarket = getDaysOnMarket(listing);
                  const warning = getStageWarning(listing);
                  return (
                    <Card
                      key={listing.id}
                      className={cn(
                        "p-0 overflow-hidden bg-card border border-border hover:border-primary/30 transition-colors zoho-card",
                        warning === "critical" && "border-amber-500/50 bg-amber-500/5",
                        warning === "warning" && "border-amber-400/30"
                      )}
                    >
                      {listing.listing_image_url ? (
                        <div className="aspect-[16/10] w-full bg-muted border-b border-border">
                          <img
                            src={listing.listing_image_url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      <div className="flex items-start gap-2 p-2.5">
                        <div
                          className="mt-0.5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
                          draggable
                          onDragStart={(e) => handleDragStart(e, listing)}
                          role="button"
                          aria-label="Drag to move stage"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {contact && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <User className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-[11px] text-muted-foreground truncate">{contact.name}</span>
                            </div>
                          )}
                          <Link
                            to={`/listings/${listing.id}`}
                            className="font-medium text-sm text-foreground hover:text-primary hover:underline line-clamp-2"
                          >
                            {listing.address}
                          </Link>
                          <div className="flex items-center gap-1 mt-1">
                            <DollarSign className="w-3 h-3 text-primary shrink-0" />
                            <span className="text-xs text-primary font-medium">{formatCurrency(listing.price)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {daysInStage}d in stage · {listing.updated_at ? format(new Date(listing.updated_at), "d MMM") : "—"}
                            </span>
                            {warning !== "none" && (
                              <Badge variant={warning === "critical" ? "destructive" : "secondary"} className="text-[9px] px-1 py-0 h-4">
                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                                {warning === "critical" ? "Stale" : "Check in"}
                              </Badge>
                            )}
                          </div>
                          {daysOnMarket != null && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">DOM {daysOnMarket}d</p>
                          )}
                          {listing.property_type && (
                            <div className="flex items-center gap-1 mt-1">
                              <Home className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground capitalize">{listing.property_type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      ) : null}

      {!showTable && listings.length === 0 && !isLoading && (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg mt-6">
          <Home className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground mb-1">No listings yet</p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4">
            Add listing
          </Button>
        </div>
      )}

      <AddListingDialog open={dialogOpen} onOpenChange={setDialogOpen} stages={SALES_KANBAN_STAGES} />
    </div>
  );
}
