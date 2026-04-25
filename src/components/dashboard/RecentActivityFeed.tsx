import { Card } from "@/components/ui/card";
import { useRecentActivityLog } from "@/hooks/useActivityLog";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Phone, Mail, Home, FileText, RefreshCw, Cog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ActivityLogRow } from "@/hooks/useActivityLog";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  inspection: Home,
  status_change: RefreshCw,
  system: Cog,
  open_house: Home,
  settlement: FileText,
};

export function RecentActivityFeed() {
  const { data: items = [], isLoading } = useRecentActivityLog(15);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="zoho-card p-3 border-border">
        <h3 className="text-base font-semibold text-foreground mb-2">Recent activity</h3>
        <div className="space-y-1.5">
          <div className="h-9 bg-white/10 rounded animate-pulse" />
          <div className="h-9 bg-white/10 rounded animate-pulse" />
          <div className="h-9 bg-white/10 rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="zoho-card p-3 border-border">
      <h3 className="text-base font-semibold text-foreground mb-2">Recent activity</h3>
      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-0.5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg border border-dashed border-border">
            <MessageSquare className="w-8 h-8 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">No activity yet. Log calls, notes, or interactions to see them here.</p>
            <p className="text-xs text-white/50">Open a contact and add an activity to get started.</p>
          </div>
        ) : (
          items.map((row: ActivityLogRow) => {
            const Icon = ICONS[row.activity_type] ?? MessageSquare;
            return (
              <button
                key={row.id}
                type="button"
                className="w-full flex gap-2 text-left p-1.5 rounded-md hover:bg-white/5 transition-colors"
                onClick={() => {
                  if (row.contact_id) navigate(`/contacts/${row.contact_id}`);
                  else if (row.property_id) navigate(`/properties/${row.property_id}`);
                }}
              >
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{row.title}</p>
                  {row.description && (
                    <p className="text-xs text-muted-foreground truncate">{row.description}</p>
                  )}
                  <p className="text-xs text-white/50 mt-0.5">
                    {formatDistanceToNow(new Date(row.occurred_at), { addSuffix: true })}
                    {row.contact_id || row.property_id ? " · Tap to open" : ""}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </Card>
  );
}
