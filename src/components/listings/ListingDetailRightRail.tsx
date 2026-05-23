import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, Clock, DollarSign, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityActivitySchedulesPanel } from "@/components/shared/EntityActivitySchedulesPanel";
import { EntityModificationsPanel } from "@/components/shared/EntityModificationsPanel";
import { useListingContactLinks } from "@/hooks/useListingContactLinks";
import { useListingOpenInspections } from "@/hooks/useListingOpenInspections";
import type { Listing } from "@/hooks/useListings";
import { listingKanbanColumnId, LISTING_PIPELINE_STAGE_OPTIONS } from "@/lib/listingKanbanStages";
import { listingPublicPriceLabel, listingSearchPrice } from "@/lib/listingPriceFields";
import { partitionInspections } from "@/lib/ofiInspection";
import type { Tables } from "@/integrations/supabase/types";

type ActivityRow = Tables<"activity_log">;

type Props = {
  listing: Listing;
  listingId: string;
  domDays: number | null;
  recentActivity: ActivityRow[];
  onMatchBuyers: () => void;
  formatAud: (n: number | null | undefined) => string;
};

function pipelineLabel(stage: string | null | undefined): string {
  const col = listingKanbanColumnId(stage);
  return LISTING_PIPELINE_STAGE_OPTIONS.find((s) => s.id === col)?.label ?? col;
}

export function ListingDetailRightRail({
  listing,
  listingId,
  domDays,
  recentActivity,
  onMatchBuyers,
  formatAud,
}: Props) {
  const { data: links = [] } = useListingContactLinks(listingId);
  const { data: inspections = [] } = useListingOpenInspections(listingId);

  const prospectiveBuyers = links.filter((l) => l.role === "prospective_buyer" || l.role === "key_buyer");
  const { upcoming } = partitionInspections(inspections);
  const nextOfi = upcoming[0] ?? null;

  const ext = listing as Listing & { display_price?: string | null; search_price?: number | null };

  return (
    <aside className="hidden xl:block space-y-4">
      <Card className="zoho-card p-4 border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Listing details
        </h3>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Stage</dt>
            <dd className="font-medium text-right">{pipelineLabel(listing.pipeline_stage)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Price
            </dt>
            <dd className="font-medium text-right tabular-nums">{listingPublicPriceLabel(ext, formatAud)}</dd>
          </div>
          {listingSearchPrice(ext) != null && ext.display_price?.trim() ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Search price</dt>
              <dd className="font-medium text-right tabular-nums">{formatAud(listingSearchPrice(ext))}</dd>
            </div>
          ) : null}
          {domDays != null ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Days on market
              </dt>
              <dd className="font-medium tabular-nums">{domDays}</dd>
            </div>
          ) : null}
          {listing.created_at ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Listed</dt>
              <dd className="font-medium">{format(new Date(listing.created_at), "d MMM yyyy")}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card className="zoho-card p-4 border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Prospective buyers
          </h3>
          <Badge variant="secondary" className="tabular-nums">
            {prospectiveBuyers.length}
          </Badge>
        </div>
        {prospectiveBuyers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No buyers linked yet. OFI check-ins add them automatically.</p>
        ) : (
          <ul className="space-y-1.5 mb-3">
            {prospectiveBuyers.slice(0, 4).map((link) => (
              <li key={link.id}>
                <Link
                  to={`/contacts/${link.contact_id}`}
                  className="text-sm text-primary hover:underline line-clamp-1"
                >
                  {link.contacts?.name ??
                    [link.contacts?.first_name, link.contacts?.last_name].filter(Boolean).join(" ") ??
                    "Contact"}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs" onClick={onMatchBuyers}>
          Match buyers
        </Button>
      </Card>

      <Card className="zoho-card p-4 border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Inspections
        </h3>
        {nextOfi ? (
          <p className="text-sm font-medium">
            {format(new Date(nextOfi.starts_at), "EEE d MMM · h:mm a")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No upcoming open inspections.</p>
        )}
        <p className="text-xs text-muted-foreground mt-1 tabular-nums">
          {inspections.length} scheduled ·{" "}
          {inspections.reduce((n, i) => n + i.attendeeCount, 0)} attendees
        </p>
      </Card>

      <Card className="zoho-card p-4 border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Recent activity
        </h3>
        {recentActivity.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentActivity.slice(0, 3).map((row) => (
              <li key={row.id} className="text-xs border-b border-border/50 last:border-0 pb-2 last:pb-0">
                <p className="font-medium line-clamp-1">{row.title}</p>
                <p className="text-muted-foreground mt-0.5">
                  {format(new Date(row.occurred_at), "d MMM, h:mm a")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EntityActivitySchedulesPanel appliesTo="listing" listingId={listingId} compact />
      <EntityModificationsPanel entityType="listing" entityId={listingId} compact />
    </aside>
  );
}
