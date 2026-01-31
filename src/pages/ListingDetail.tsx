import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { useListing } from "@/hooks/useListings";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: listing, isLoading, isError, refetch } = useListing(id);

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in text-center py-12">
        <Home className="w-12 h-12 mx-auto mb-4 text-white/60 opacity-50" />
        <p className="font-medium text-white mb-2">Couldn&apos;t load listing</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>Back</Button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="animate-fade-in text-center py-12">
        <p className="text-white/60">Listing not found</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-4">Back</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Listings", href: "/dashboard" },
          { label: listing.address || "Listing" },
        ]}
        className="mb-4"
      />
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 truncate">
            <Home className="w-6 h-6 shrink-0" />
            {listing.address || "Listing"}
          </h1>
          <p className="text-white/60 text-sm mt-0.5">
            {listing.pipeline_stage ? String(listing.pipeline_stage).replace(/-/g, " ") : "—"} · Updated {listing.updated_at ? format(new Date(listing.updated_at), "PP") : ""}
          </p>
        </div>
      </div>

      <Card className="zoho-card p-6 mb-6 border-white/10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {listing.price != null && (
            <div>
              <span className="text-white/60">Price</span>
              <p className="font-medium">${Number(listing.price).toLocaleString()}</p>
            </div>
          )}
          {listing.property_type && (
            <div>
              <span className="text-white/60">Type</span>
              <p className="font-medium capitalize">{listing.property_type}</p>
            </div>
          )}
          {listing.notes && (
            <div className="sm:col-span-2">
              <span className="text-white/60">Notes</span>
              <p className="font-medium whitespace-pre-wrap mt-1">{listing.notes}</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="zoho-card p-6 border-white/10">
        <ActivityTimeline entityType="listing" entityId={id} showAddNote={true} />
      </Card>
    </div>
  );
}
