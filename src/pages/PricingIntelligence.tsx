import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListings, type ListingWithContact } from "@/hooks/useListings";
import { ArrowRight, Home, LineChart, Search, SlidersHorizontal } from "lucide-react";

function formatAud(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

function listingLabel(l: ListingWithContact): string {
  const a = (l.address ?? "").trim();
  if (a) return a;
  return `Listing ${l.id.slice(0, 8)}…`;
}

type SortKey = "recent" | "price-high" | "price-low" | "stage";
type AttentionFilter = "all" | "needs-attention";

export default function PricingIntelligence() {
  const { data: listings = [], isLoading } = useListings();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("all");

  const { data: analyses = [] } = useQuery({
    queryKey: ["pricing-analysis-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_analyses")
        .select("listing_id,recommended_price,updated_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const analysisByListing = useMemo(() => {
    const m = new Map<string, { recommended_price: number | null; updated_at: string | null }>();
    for (const row of analyses) {
      m.set(row.listing_id, {
        recommended_price: row.recommended_price ?? null,
        updated_at: row.updated_at ?? null,
      });
    }
    return m;
  }, [analyses]);

  const active = useMemo(
    () =>
      listings.filter((l) => String(l.status ?? "active").toLowerCase() !== "withdrawn"),
    [listings],
  );
  const stageOptions = useMemo(() => {
    const values = Array.from(
      new Set(active.map((l) => (l.pipeline_stage ?? "").trim()).values()),
    ).filter(Boolean);
    return values.sort((a, b) => a.localeCompare(b));
  }, [active]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = active.filter((l) => {
      if (stageFilter !== "all" && (l.pipeline_stage ?? "") !== stageFilter) return false;
      if (attentionFilter === "needs-attention") {
        const row = analysisByListing.get(l.id);
        const needsAttention = !row || row.recommended_price == null || l.price == null;
        if (!needsAttention) return false;
      }
      if (!q) return true;
      const haystack = [
        listingLabel(l),
        l.contacts?.name ?? "",
        l.pipeline_stage ?? "",
        l.price != null ? String(l.price) : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "price-high") return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortBy === "price-low") return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (sortBy === "stage") return String(a.pipeline_stage ?? "").localeCompare(String(b.pipeline_stage ?? ""));
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });
    return list;
  }, [active, query, stageFilter, sortBy, analysisByListing, attentionFilter]);

  const stats = useMemo(() => {
    const priced = active.filter((l) => l.price != null).length;
    const modelReady = active.filter((l) => analysisByListing.has(l.id)).length;
    const needAttention = active.filter((l) => {
      const row = analysisByListing.get(l.id);
      return !row || row.recommended_price == null || l.price == null;
    }).length;
    const withRecommendation = active.filter((l) => {
      const row = analysisByListing.get(l.id);
      return row?.recommended_price != null;
    }).length;
    const avgPrice =
      active.reduce((acc, l) => acc + (typeof l.price === "number" ? l.price : 0), 0) / Math.max(1, priced);
    return { priced, modelReady, withRecommendation, avgPrice, needAttention };
  }, [active, analysisByListing]);

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      <PageHeader
        title="Pricing intelligence"
        description="Jump into TAM, brackets, and competitor context on each listing — the full model lives on listing detail."
      />

      <Card className="zoho-card p-5 border-border flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
          <LineChart className="h-5 w-5" />
        </div>
        <div className="space-y-2 min-w-0">
          <p className="text-sm font-medium text-foreground">How this fits the roadmap</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Open any row below to land on the listing page with the <strong>Pricing intelligence</strong> panel
            (TAM range, brackets, recommendations). Use the pipeline board when you want kanban context first.
          </p>
          <Button variant="outline" size="sm" className="mt-1 gap-1" asChild>
            <Link to="/listings">
              <Home className="h-3.5 w-3.5" />
              Listings pipeline
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="zoho-card p-5 border-border">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Guide price set</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">{stats.priced}/{active.length}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Model ready</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">{stats.modelReady}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Recommendation set</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">{stats.withRecommendation}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Avg guide</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">{formatAud(stats.avgPrice)}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listing, vendor, stage…"
              className="h-8 bg-input pl-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Refine
            </div>
            <div className="inline-flex h-8 items-center rounded-md border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setAttentionFilter("all")}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${attentionFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setAttentionFilter("needs-attention")}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${attentionFilter === "needs-attention" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Needs attention
              </button>
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-8 w-[10.5rem] bg-popover text-xs">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {stageOptions.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="h-8 w-[9.5rem] bg-popover text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Newest</SelectItem>
                <SelectItem value="price-high">Price: high</SelectItem>
                <SelectItem value="price-low">Price: low</SelectItem>
                <SelectItem value="stage">Stage A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Active listings</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setAttentionFilter((prev) => (prev === "needs-attention" ? "all" : "needs-attention"))
              }
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={
                attentionFilter === "needs-attention"
                  ? "Show all listings"
                  : "Filter listings needing attention"
              }
              title={
                attentionFilter === "needs-attention"
                  ? "Showing needs attention only (click to show all)"
                  : "Click to show needs attention only"
              }
            >
              <Badge
                variant={attentionFilter === "needs-attention" ? "default" : "secondary"}
                className="text-[10px] font-normal tabular-nums cursor-pointer"
              >
                {stats.needAttention} need attention
              </Badge>
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">{visible.length} shown · {active.length} total</span>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active listings. Add one from the listings board.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border/80">
            {visible.map((l) => {
              const pricingMeta = analysisByListing.get(l.id);
              return (
              <li key={l.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 px-3 first:pt-2 last:pb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{listingLabel(l)}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {l.pipeline_stage ? (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {l.pipeline_stage.replace(/_/g, " ")}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground tabular-nums">{formatAud(l.price)}</span>
                    {pricingMeta ? (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        model ready
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        model missing
                      </Badge>
                    )}
                    {pricingMeta?.recommended_price != null ? (
                      <span className="text-xs text-foreground/90 tabular-nums">
                        Rec: {formatAud(pricingMeta.recommended_price)}
                      </span>
                    ) : null}
                    {l.contacts?.name ? (
                      <span className="text-xs text-muted-foreground truncate">Vendor: {l.contacts.name}</span>
                    ) : null}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-primary" asChild>
                  <Link to={`/listings/${l.id}`}>
                    Open pricing panel
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            )})}
          </ul>
        )}
      </Card>
    </div>
  );
}
