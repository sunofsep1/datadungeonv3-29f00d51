import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarClock, FileSignature, Home, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContactBuyerActivity } from "@/hooks/useContactBuyerActivity";

type Props = {
  contactId: string;
  compact?: boolean;
};

function kindIcon(kind: string) {
  if (kind === "offer") return FileSignature;
  if (kind === "inspection") return CalendarClock;
  return Home;
}

export function ContactBuyerActivityPanel({ contactId, compact }: Props) {
  const { data: rows = [], isLoading } = useContactBuyerActivity(contactId);
  const shown = compact ? rows.slice(0, 5) : rows.slice(0, 12);

  return (
    <Card className="zoho-card p-4 border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Buyer / tenant activity
        </h3>
        <Badge variant="secondary" className="tabular-nums">
          {rows.length}
        </Badge>
      </div>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">No property enquiries or inspections yet.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((row) => {
            const Icon = kindIcon(row.kind);
            return (
              <li key={row.id} className="flex gap-2 text-sm">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                <div className="min-w-0 flex-1">
                  <Link to={`/listings/${row.listingId}`} className="text-primary hover:underline line-clamp-1 font-medium">
                    {row.label}
                  </Link>
                  {row.detail ? <p className="text-xs text-muted-foreground line-clamp-1">{row.detail}</p> : null}
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {format(new Date(row.occurredAt), "d MMM yyyy")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
