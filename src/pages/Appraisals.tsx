import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays } from "date-fns";
import {
  ClipboardList,
  Clock,
  DollarSign,
  Home,
  Plus,
  User,
  ImageIcon,
  MoreHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddListingDialog } from "@/components/listings/AddListingDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useContacts } from "@/hooks/useContacts";
import { useProperties } from "@/hooks/useProperties";
import { useLogListingStageMove } from "@/hooks/useEvents";
import { useListings, useUpdateListing, useDeleteListing, type Listing, type ListingWithContact } from "@/hooks/useListings";
import { filterAppraisalPipelineListings } from "@/lib/appraisalListings";
import { getListingHeroImageUrl } from "@/lib/listingFromProperty";
import { leadTemperatureForListingPipelineStage } from "@/lib/leadCategoryDerivation";
import {
  LEAD_TEMPERATURE_LABELS,
  TIMEFRAME_LABELS,
  leadTemperatureBadgeClass,
  parseLeadTemperature,
} from "@/lib/leadCategories";
import { listingSearchPrice } from "@/lib/listingPriceFields";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function daysInStage(listing: Listing): number {
  if (!listing.updated_at) return 0;
  return Math.max(0, differenceInCalendarDays(new Date(), new Date(listing.updated_at)));
}

export default function Appraisals() {
  const { data: listings = [], isLoading } = useListings();
  const { data: properties = [] } = useProperties();
  const { data: contacts = [] } = useContacts();
  const updateListing = useUpdateListing();
  const deleteListing = useDeleteListing();
  const { logStageMove } = useLogListingStageMove();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [confirmListed, setConfirmListed] = useState<Listing | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Listing | null>(null);

  const contactMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    contacts.forEach((c) => map.set(c.id, { id: c.id, name: c.name ?? "Contact" }));
    return map;
  }, [contacts]);

  const propertyImagesById = useMemo(() => {
    const map = new Map<string, unknown>();
    properties.forEach((p) => map.set(p.id, p.images));
    return map;
  }, [properties]);

  const getHeroImage = (listing: Listing) =>
    getListingHeroImageUrl(
      listing.listing_image_url,
      listing.property_id ? propertyImagesById.get(listing.property_id) : null,
    );

  const appraisalListings = useMemo(() => {
    const rows = filterAppraisalPipelineListings(listings);
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((l) => {
      const contact =
        (l as ListingWithContact).contacts ||
        (l.contact_id ? contactMap.get(l.contact_id) : null);
      const haystack = [l.address, contact?.name, l.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [listings, query, contactMap]);

  const kpi = useMemo(() => {
    const values = appraisalListings
      .map((l) => listingSearchPrice(l))
      .filter((v): v is number => v != null);
    const totalValue = values.reduce((sum, v) => sum + v, 0);
    const days = appraisalListings.map(daysInStage);
    const avgDays = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
    return {
      count: appraisalListings.length,
      totalValue,
      avgDays,
    };
  }, [appraisalListings]);

  const handleMarkListed = async (listing: Listing) => {
    setAdvancingId(listing.id);
    const oldStage = listing.pipeline_stage || "appraisal";
    try {
      await updateListing.mutateAsync({
        id: listing.id,
        pipeline_stage: "listing",
        previous_pipeline_stage: oldStage,
      });
      try {
        await logStageMove(listing.id, listing.contact_id, oldStage, "listing", listing.address);
      } catch {
        /* activity optional */
      }
      toast({
        title: "Moved to Listed",
        description: listing.address ?? "This appraisal is now on the Listings board.",
      });
    } catch (error) {
      toast({
        title: "Could not update stage",
        description: supabaseErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setAdvancingId(null);
    }
  };

  const handleDelete = async (listing: Listing) => {
    try {
      await deleteListing.mutateAsync(listing.id);
      toast({
        title: "Appraisal deleted",
        description: listing.address ?? "The appraisal has been removed.",
      });
    } catch (error) {
      toast({
        title: "Could not delete appraisal",
        description: supabaseErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader
        title="Appraisals"
        description="Open appraisals — properties in appraisal / prep before they go listed."
        actions={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add appraisal
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="zoho-card border-border p-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            In appraisal
          </div>
          <p className="text-2xl font-bold tabular-nums">{kpi.count}</p>
        </Card>
        <Card className="zoho-card border-border p-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            Total guide value
          </div>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(kpi.totalValue)}</p>
        </Card>
        <Card className="zoho-card border-border p-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Avg days in stage
          </div>
          <p className="text-2xl font-bold tabular-nums">{kpi.count ? kpi.avgDays : "—"}</p>
        </Card>
      </div>

      <div className="mb-4 max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address or vendor…"
          aria-label="Search appraisals"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
          ))}
        </div>
      ) : appraisalListings.length === 0 ? (
        <Card className="zoho-card border-dashed border-border p-10 text-center">
          <Home className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No appraisals in pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an appraisal to start tracking a property before it goes listed.
          </p>
          <Button className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add appraisal
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {appraisalListings.map((listing) => {
            const ext = listing as ListingWithContact;
            const contact =
              ext.contacts || (listing.contact_id ? contactMap.get(listing.contact_id) : null);
            const guide = listingSearchPrice(listing);
            const stageDays = daysInStage(listing);
            const heroImage = getHeroImage(listing);
            const tempKey = leadTemperatureForListingPipelineStage(
              listing.pipeline_stage,
              parseLeadTemperature(listing.lead_temperature),
            );
            const temp = LEAD_TEMPERATURE_LABELS[tempKey];
            const timeframe = listing.timeframe_category
              ? TIMEFRAME_LABELS[listing.timeframe_category as keyof typeof TIMEFRAME_LABELS]
              : null;

            return (
              <Card
                key={listing.id}
                className="zoho-card relative flex flex-col overflow-hidden border-border p-0 transition-colors hover:border-primary/30"
              >
                <div className="relative">
                  <Link to={`/listings/${listing.id}`} className="group block">
                    {heroImage ? (
                      <div className="aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted">
                        <img
                          src={heroImage}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center border-b border-border bg-muted/60">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
                        aria-label={`Actions for ${listing.address || "appraisal"}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link to={`/listings/${listing.id}`}>Open appraisal</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={advancingId === listing.id}
                        onSelect={() => setConfirmListed(listing)}
                      >
                        Move to listed stage
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={deleteListing.isPending}
                        onSelect={() => setConfirmDelete(listing)}
                      >
                        Delete appraisal
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link
                  to={`/listings/${listing.id}`}
                  className="flex flex-1 flex-col gap-3 p-4 hover:bg-muted/20"
                >
                  <div className="min-w-0 flex-1">
                    {contact ? (
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{contact.name}</span>
                      </div>
                    ) : null}
                    <p className="font-medium text-foreground line-clamp-2">
                      {listing.address || "Untitled appraisal"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <DollarSign className="h-3 w-3 text-primary" />
                        {formatCurrency(guide)}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3" />
                        {stageDays}d in stage
                      </span>
                    </div>
                    {(temp || timeframe) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {temp ? (
                          <Badge variant="outline" className={leadTemperatureBadgeClass(tempKey)}>
                            {temp}
                          </Badge>
                        ) : null}
                        {timeframe ? <Badge variant="outline">{timeframe}</Badge> : null}
                      </div>
                    )}
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <AddListingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        createMode="appraisal"
        stages={[{ id: "appraisal", name: "Appraisal / prep" }]}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this appraisal?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.address
                ? `${confirmDelete.address} will be permanently removed from the appraisal pipeline. The contact and property records are kept.`
                : "This appraisal will be permanently removed. The contact and property records are kept."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteListing.isPending}
              onClick={() => {
                if (confirmDelete) void handleDelete(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmListed} onOpenChange={(open) => !open && setConfirmListed(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to listed stage?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmListed?.address
                ? `${confirmListed.address} will leave Appraisals and appear on the Listings pipeline as Listed.`
                : "This property will leave Appraisals and appear on the Listings pipeline as Listed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!advancingId}
              onClick={() => {
                if (confirmListed) void handleMarkListed(confirmListed);
                setConfirmListed(null);
              }}
            >
              Move to listed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
