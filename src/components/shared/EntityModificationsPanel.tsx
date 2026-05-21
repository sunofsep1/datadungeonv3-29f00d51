import { format } from "date-fns";
import { History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityAuditLog } from "@/hooks/useEntityAuditLog";

type Props = {
  entityType: "contact" | "listing" | "property";
  entityId: string | undefined;
  className?: string;
  compact?: boolean;
};

export function EntityModificationsPanel({ entityType, entityId, className, compact }: Props) {
  const { data: rows = [], isLoading } = useEntityAuditLog(entityType, entityId);

  return (
    <Card className={`zoho-card p-4 border-border ${className ?? ""}`}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" />
        Modifications
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>No logged field changes yet.</p>
      ) : (
        <ul className={`space-y-2 overflow-y-auto pr-1 ${compact ? "max-h-48" : "max-h-64"}`}>
          {rows.map((row) => (
            <li key={row.id} className="text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0">
              <p className="text-foreground">{row.summary ?? row.field_name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {format(new Date(row.changed_at), "d MMM yyyy, h:mm a")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
