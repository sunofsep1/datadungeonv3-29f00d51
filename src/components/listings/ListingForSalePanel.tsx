import { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUpdateListing } from "@/hooks/useListings";
import { listingSearchPrice, type ListingPriceSource } from "@/lib/listingPriceFields";

export type ListingForSaleFields = ListingPriceSource & {
  id: string;
  search_price_min?: number | null;
  search_price_max?: number | null;
};

type Props = {
  listing: ListingForSaleFields;
  onUpdated?: () => void;
};

function formatAud(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function ListingForSalePanel({ listing, onUpdated }: Props) {
  const { toast } = useToast();
  const updateListing = useUpdateListing();

  const [searchPrice, setSearchPrice] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");

  useEffect(() => {
    const sp = listingSearchPrice(listing);
    setSearchPrice(sp != null ? String(sp) : "");
    setDisplayPrice(listing.display_price?.trim() ?? "");
    setRangeMin(
      listing.search_price_min != null && listing.search_price_min > 0
        ? String(listing.search_price_min)
        : "",
    );
    setRangeMax(
      listing.search_price_max != null && listing.search_price_max > 0
        ? String(listing.search_price_max)
        : "",
    );
  }, [listing]);

  const save = async (patch: {
    search_price?: number | null;
    display_price?: string | null;
    search_price_min?: number | null;
    search_price_max?: number | null;
  }) => {
    try {
      await updateListing.mutateAsync({ id: listing.id, ...patch });
      onUpdated?.();
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Update failed",
        variant: "destructive",
      });
    }
  };

  const commitSearchPrice = () => {
    const next = parseMoneyInput(searchPrice);
    const cur = listingSearchPrice(listing);
    if (next === cur) return;
    void save({ search_price: next });
  };

  const commitDisplayPrice = () => {
    const next = displayPrice.trim() || null;
    const cur = listing.display_price?.trim() || null;
    if (next === cur) return;
    void save({ display_price: next });
  };

  const commitRange = () => {
    const min = parseMoneyInput(rangeMin);
    const max = parseMoneyInput(rangeMax);
    if (min != null && max != null && min > max) {
      toast({
        title: "Invalid range",
        description: "Search range minimum must be less than maximum.",
        variant: "destructive",
      });
      return;
    }
    const curMin = listing.search_price_min ?? null;
    const curMax = listing.search_price_max ?? null;
    if (min === curMin && max === curMax) return;
    void save({ search_price_min: min, search_price_max: max });
  };

  const internal = listingSearchPrice(listing);
  const publicLabel = listing.display_price?.trim() || formatAud(internal);

  return (
    <Card className="zoho-card p-5 border-border">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DollarSign className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">For sale pricing</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search price is internal for GCI and matching. Display price is what buyers see on portals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Public display</p>
          <p className="text-lg font-semibold text-foreground mt-1 tabular-nums">{publicLabel}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Internal search</p>
          <p className="text-lg font-semibold text-foreground mt-1 tabular-nums">{formatAud(internal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="listing-search-price">Search price (internal)</Label>
          <Input
            id="listing-search-price"
            inputMode="numeric"
            placeholder="e.g. 1850000"
            value={searchPrice}
            onChange={(e) => setSearchPrice(e.target.value)}
            onBlur={commitSearchPrice}
            disabled={updateListing.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="listing-display-price">Display price (public)</Label>
          <Input
            id="listing-display-price"
            placeholder='e.g. "Offers Above $2m"'
            value={displayPrice}
            onChange={(e) => setDisplayPrice(e.target.value)}
            onBlur={commitDisplayPrice}
            disabled={updateListing.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="listing-search-min">Search range — from</Label>
          <Input
            id="listing-search-min"
            inputMode="numeric"
            placeholder="Portal filter min"
            value={rangeMin}
            onChange={(e) => setRangeMin(e.target.value)}
            onBlur={commitRange}
            disabled={updateListing.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="listing-search-max">Search range — to</Label>
          <Input
            id="listing-search-max"
            inputMode="numeric"
            placeholder="Portal filter max"
            value={rangeMax}
            onChange={(e) => setRangeMax(e.target.value)}
            onBlur={commitRange}
            disabled={updateListing.isPending}
          />
        </div>
      </div>
    </Card>
  );
}
