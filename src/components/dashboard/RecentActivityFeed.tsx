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
      <Card className="zoho-card p-4 border-white/10">
        <h3 className="font-semibold text-foreground mb-3">Recent activity</h3>
        <div className="space-y-2">
          <div className="h-10 bg-white/10 rounded animate-pulse" />
          <div className="h-10 bg-white/10 rounded animate-pulse" />
          <div className="h-10 bg-white/10 rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="zoho-card p-4 border-white/10">
      <h3 className="font-semibold text-foreground mb-3">Recent activity</h3>
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 px-4 rounded-lg border border-dashed border-white/10">
            <MessageSquare className="w-10 h-10 shrink-0 text-white/40" />
            <p className="text-sm text-white/60 text-center">No activity yet. Log calls, notes, or interactions to see them here.</p>
            <p className="text-xs text-white/50">Open a contact and add an activity to get started.</p>
          </div>
        ) : (
          items.map((row: ActivityLogRow) => {
            const Icon = ICONS[row.activity_type] ?? MessageSquare;
            return (
              <button
                key={row.id}
                type="button"
                className="w-full flex gap-3 text-left p-2 rounded-lg hover:bg-white/5 transition-colors"
                onClick={() => {
                  if (row.contact_id) navigate(`/contacts/${row.contact_id}`);
                  else if (row.property_id) navigate(`/properties/${row.property_id}`);
                }}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{row.title}</p>
                  {row.description && (
                    <p className="text-xs text-white/60 truncate">{row.description}</p>
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
