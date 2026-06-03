import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMarkNotificationRead, useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function DailyHubNotificationsStrip() {
  const { data = [], isLoading } = useNotifications(10);
  const markRead = useMarkNotificationRead();

  if (isLoading) {
    return (
      <Card className="zoho-card p-4 border-border">
        <p className="text-xs text-muted-foreground">Loading notifications…</p>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="zoho-card p-4 border-border">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm font-semibold text-foreground">Notifications</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Nothing in your feed yet. Stale-contact alerts, score changes, and workflow events appear here when generated.
        </p>
      </Card>
    );
  }

  return (
    <Card className="zoho-card p-4 border-border">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm font-semibold text-foreground truncate">Recent notifications</p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0" asChild>
          <Link to="/tasks">Tasks</Link>
        </Button>
      </div>
      <ul className="space-y-2.5">
        {data.map((n) => (
          <li
            key={n.id}
            className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-2.5 last:border-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              {n.action_url ? (
                <Link
                  to={n.action_url}
                  className="text-sm font-medium text-foreground hover:text-primary hover:underline block truncate"
                  onClick={() => markRead.mutate(n.id)}
                >
                  {n.title}
                </Link>
              ) : (
                <span className="text-sm font-medium text-foreground block truncate">{n.title}</span>
              )}
              {n.body ? (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
              ) : null}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] shrink-0 capitalize",
                n.priority === "urgent" && "border-destructive/50 text-destructive",
                n.priority === "action_required" && "border-amber-500/50 text-amber-700 dark:text-amber-400",
              )}
            >
              {n.priority === "action_required" ? "Action" : n.priority}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
