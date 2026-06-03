import { formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDailyTouchSummary, useWeeklyTouchSummary } from "@/hooks/useTouches";
import { useNotifications, useMarkNotificationRead, useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useNotificationDigest } from "@/hooks/useNotificationDigest";
import { TouchScorecard } from "@/components/dashboard/TouchScorecard";
import { DailyHubPriorityAndSmartLists } from "@/components/dashboard/DailyHubPriorityAndSmartLists";
import { notificationKindIcon } from "@/lib/notificationPresentation";

function notificationPriorityDot(priority: string) {
  if (priority === "urgent") return "bg-red-500";
  if (priority === "action_required") return "bg-amber-500";
  return "bg-sky-500";
}

export function DashboardCommandCenter() {
  useNotificationDigest();

  const navigate = useNavigate();
  const { data: recentNotifs = [] } = useNotifications(6);
  const markNotifRead = useMarkNotificationRead();

  const { data: dailyTouches = [] } = useDailyTouchSummary();
  const { data: weeklyTouches = [] } = useWeeklyTouchSummary();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const todayTouchCount = dailyTouches.reduce((sum, row) => sum + Number(row.completed ?? 0), 0);

  return (
    <Card className="zoho-card p-4 border-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Command center
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Priority counts and smart lists — same layout as Daily Hub below.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs shrink-0 self-start" asChild>
          <Link to="/attention-hub" className="gap-1">
            Daily Hub <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <DailyHubPriorityAndSmartLists />

      <TouchScorecard
        dailyTouches={dailyTouches}
        weeklyTouches={weeklyTouches}
        todayTotalTouches={todayTouchCount}
        unreadCount={unreadCount}
      />

      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Recent alerts</p>
        {recentNotifs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">No recent notifications in the list. Use the header bell for the full drawer.</p>
        ) : (
          <ul className="rounded-lg border border-border/60 divide-y divide-border/50 bg-card/30">
            {recentNotifs.map((n) => {
              const KindIcon = notificationKindIcon(n.kind);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent/50 transition-colors flex gap-2.5 items-start"
                    onClick={() => {
                      if (!n.read_at) markNotifRead.mutate(n.id);
                      if (n.action_url) navigate(n.action_url);
                    }}
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                      <KindIcon className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            notificationPriorityDot(n.priority),
                          )}
                        />
                        <span className={cn("line-clamp-2", !n.read_at && "font-semibold text-foreground")}>
                          {n.title}
                        </span>
                      </span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5 pl-3.5 tabular-nums">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                      {n.action_label ? (
                        <span className="block text-[10px] text-primary mt-0.5 pl-3.5">{n.action_label}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
