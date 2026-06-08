import { format } from "date-fns";
import { Calendar, Clock, DollarSign } from "lucide-react";
import { ProspectiveBuyersPanel } from "@/components/listings/ProspectiveBuyersPanel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { ListingCommunicationsRail } from "@/components/listings/ListingCommunicationsRail";
import { EntityActivitySchedulesPanel } from "@/components/shared/EntityActivitySchedulesPanel";
import { EntityModificationsPanel } from "@/components/shared/EntityModificationsPanel";
import { useListingOpenInspections } from "@/hooks/useListingOpenInspections";
import type { Listing } from "@/hooks/useListings";
import { listingKanbanColumnId, LISTING_PIPELINE_STAGE_OPTIONS } from "@/lib/listingKanbanStages";
import { listingPublicPriceLabel, listingSearchPrice } from "@/lib/listingPriceFields";
import { partitionInspections } from "@/lib/ofiInspection";

import type { ListingDetailSectionId } from "@/components/listings/ListingDetailSectionNav";

type Props = {
  listing: Listing;
  listingId: string;
  domDays: number | null;
  linkedContactIds: string[];
  onMatchBuyers: () => void;
  onNavigateSection?: (sectionId: ListingDetailSectionId) => void;
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
  linkedContactIds,
  onMatchBuyers,
  onNavigateSection,
  formatAud,
}: Props) {
  const { user } = useAuth();
  const { data: inspections = [] } = useListingOpenInspections(listingId);

  const { upcoming } = partitionInspections(inspections);
  const nextOfi = upcoming[0] ?? null;

  const ext = listing as Listing & {
    display_price?: string | null;
    search_price?: number | null;
    reapit_id?: string | null;
    agentbox_id?: number | null;
    negotiator_id?: string | null;
  };
  const isNegotiator = ext.negotiator_id && user?.id && ext.negotiator_id === user.id;

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
          {isNegotiator ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Negotiator</dt>
              <dd>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  You
                </Badge>
              </dd>
            </div>
          ) : null}
          {ext.reapit_id?.trim() ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Reapit</dt>
              <dd className="text-xs font-mono truncate max-w-[140px]">{ext.reapit_id}</dd>
            </div>
          ) : null}
          {ext.agentbox_id != null ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">AgentBox</dt>
              <dd className="text-xs tabular-nums">#{ext.agentbox_id}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <ProspectiveBuyersPanel listing={listing} listingId={listingId} onMatchBuyers={onMatchBuyers} />

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

      <ListingCommunicationsRail
        listingId={listingId}
        linkedContactIds={linkedContactIds}
        onViewAll={() => onNavigateSection?.("listing-activity")}
      />

      <EntityActivitySchedulesPanel appliesTo="listing" listingId={listingId} compact />
      <EntityModificationsPanel entityType="listing" entityId={listingId} compact />
    </aside>
  );
}
