import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCommunicationsTimeline } from "@/hooks/useCommunicationsTimeline";
import { scrollToListingSection } from "@/components/listings/ListingDetailSectionNav";

type Props = {
  listingId: string;
  linkedContactIds: string[];
};

export function ListingCommunicationsRail({ listingId, linkedContactIds }: Props) {
  const { items, isLoading } = useCommunicationsTimeline({
    listingId,
    linkedContactIds,
    unifiedComms: true,
    limit: 5,
  });

  return (
    <Card className="zoho-card p-4 border-border">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Communications
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] text-muted-foreground"
          onClick={() => scrollToListingSection("listing-activity")}
        >
          View all
        </Button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No notes, calls, SMS, or emails logged yet.</p>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.id} className="text-xs border-b border-border/50 last:border-0 pb-2 last:pb-0">
              <p className="font-medium line-clamp-1 capitalize">{item.title}</p>
              <p className="text-muted-foreground mt-0.5">
                {format(new Date(item.occurredAt), "d MMM, h:mm a")} · {item.kind}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
