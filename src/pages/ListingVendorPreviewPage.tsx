import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Bed, Bath, CarFront, CalendarClock, FileSignature, Home, Ruler, Users } from "lucide-react";
import { useMemo } from "react";
import { useListing } from "@/hooks/useListings";
import { useProperty } from "@/hooks/useProperties";
import { useListingOffers } from "@/hooks/useListingOffers";
import { useListingOpenInspections } from "@/hooks/useListingOpenInspections";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listingPublicPriceLabel, listingSearchPrice } from "@/lib/listingPriceFields";
import { collectListingHeroUrls } from "@/lib/listingFromProperty";
import { buildListingVendorCampaignStats } from "@/lib/listingVendorReport";
import { PrintReportLayout } from "@/components/print/PrintReportLayout";

/** Reapit-style vendor preview — read-only summary for sharing with vendors. */
export default function ListingVendorPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: listing, isLoading } = useListing(id);
  const propertyId = (listing as { property_id?: string | null } | null)?.property_id;
  const { data: property } = useProperty(propertyId ?? undefined);
  const { data: offers = [] } = useListingOffers(id);
  const { data: inspections = [] } = useListingOpenInspections(id);

  const campaign = useMemo(
    () =>
      listing
        ? buildListingVendorCampaignStats(listing, offers, inspections)
        : null,
    [listing, offers, inspections],
  );

  const heroUrls = listing
    ? collectListingHeroUrls(listing.listing_image_url, property?.images ?? null)
    : [];
  const hero = heroUrls[0] ?? null;

  const beds = listing?.bedrooms ?? property?.bedrooms ?? null;
  const baths = listing?.bathrooms ?? property?.bathrooms ?? null;
  const parking = property?.car_spaces ?? null;
  const land = property?.land_area_sqm ?? null;

  if (isLoading) {
    return (
      <PrintReportLayout onClose={() => navigate(-1)}>
        <Skeleton className="h-48 w-full" />
      </PrintReportLayout>
    );
  }

  if (!listing) {
    return (
      <PrintReportLayout onClose={() => navigate(-1)}>
        <p className="p-8 text-center text-muted-foreground">Listing not found.</p>
      </PrintReportLayout>
    );
  }

  const displayPrice = listingPublicPriceLabel(listing);
  const searchPrice = listingSearchPrice(listing);

  return (
    <PrintReportLayout onClose={() => navigate(-1)}>
      <div className="contact-print-document">
        <div className="print-only-hide px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold">Vendor preview</p>
            <p className="text-xs text-muted-foreground">{listing.address}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/listings/${listing.id}`}>Open listing</Link>
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6 sm:p-10 space-y-6">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Property summary</p>
            <h1 className="text-2xl font-bold text-foreground">{listing.address}</h1>
            <p className="text-sm text-muted-foreground">
              Prepared {format(new Date(), "d MMMM yyyy")}
            </p>
          </header>

          {campaign ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CampaignStat
                icon={CalendarClock}
                label="Days on market"
                value={campaign.daysOnMarket != null ? String(campaign.daysOnMarket) : "—"}
              />
              <CampaignStat
                icon={Users}
                label="OFI attendees"
                value={String(campaign.attendeeCount)}
                detail={`${campaign.openInspectionCount} inspections`}
              />
              <CampaignStat
                icon={FileSignature}
                label="Offers"
                value={String(campaign.activeOfferCount)}
                detail={campaign.offerCount !== campaign.activeOfferCount ? `${campaign.offerCount} total` : undefined}
              />
              <CampaignStat
                icon={Home}
                label="Stage"
                value={(listing.pipeline_stage ?? "—").replace(/_/g, " ")}
              />
            </div>
          ) : null}

          {hero ? (
            <div className="rounded-xl overflow-hidden border border-border aspect-[16/10] bg-muted">
              <img src={hero} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <Card className="flex items-center justify-center h-40 bg-muted/30 border-dashed">
              <Home className="h-10 w-10 text-muted-foreground/40" />
            </Card>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {displayPrice ? (
              <div>
                <p className="text-xs text-muted-foreground">Display price</p>
                <p className="font-semibold">{displayPrice}</p>
              </div>
            ) : null}
            {searchPrice != null ? (
              <div>
                <p className="text-xs text-muted-foreground">Guide</p>
                <p className="font-semibold tabular-nums">${searchPrice.toLocaleString()}</p>
              </div>
            ) : null}
            {beds != null ? (
              <div className="flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-muted-foreground" />
                <span>{beds} bed</span>
              </div>
            ) : null}
            {baths != null ? (
              <div className="flex items-center gap-1.5">
                <Bath className="h-4 w-4 text-muted-foreground" />
                <span>{baths} bath</span>
              </div>
            ) : null}
            {parking != null ? (
              <div className="flex items-center gap-1.5">
                <CarFront className="h-4 w-4 text-muted-foreground" />
                <span>{parking} car</span>
              </div>
            ) : null}
            {land != null ? (
              <div className="flex items-center gap-1.5">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span>{land} m² land</span>
              </div>
            ) : null}
          </div>

          {(listing as { headline?: string | null }).headline ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Headline</h2>
              <p className="text-foreground">{(listing as { headline?: string }).headline}</p>
            </div>
          ) : null}

          {listing.notes ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Description</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{listing.notes}</p>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            This preview is for vendor discussion only. Marketing copy and pricing on portals may differ per your
            authority agreement.
          </p>
        </div>
      </div>
    </PrintReportLayout>
  );
}

function CampaignStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Home;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="p-3 border-border bg-muted/20">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[10px] uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-lg font-bold tabular-nums capitalize">{value}</p>
      {detail ? <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p> : null}
    </Card>
  );
}
