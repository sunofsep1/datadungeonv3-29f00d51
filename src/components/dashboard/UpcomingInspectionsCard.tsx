import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingOpenInspections } from "@/hooks/useListingOpenInspections";
import { OFI_OPEN_TYPES } from "@/lib/ofiInspection";

export function UpcomingInspectionsCard() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useUpcomingOpenInspections(6);

  if (isLoading) {
    return (
      <Card className="zoho-card p-3">
        <Skeleton className="h-4 w-40 mb-3" />
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-full" />
      </Card>
    );
  }

  return (
    <Card className="zoho-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4 zoho-accent shrink-0" />
          Upcoming inspections
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground -mr-1" onClick={() => navigate("/listings")}>
          Listings <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open inspections scheduled. Add times on a listing&apos;s OFI panel.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const typeLabel = OFI_OPEN_TYPES.find((t) => t.value === row.open_type)?.label ?? row.open_type;
            const address = row.listings?.address?.trim() || "Listing";
            return (
              <li key={row.id}>
                <Link
                  to={`/listings/${row.listing_id}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/70 p-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{address}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(row.starts_at), "EEE d MMM, h:mm a")} · {typeLabel}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
