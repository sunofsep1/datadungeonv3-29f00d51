import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  CalendarClock,
  ChevronRight,
  Clock,
  Flame,
  Home,
  ListTodo,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDaysSinceLastTouch } from "@/lib/contactLastTouch";
import { CONTACT_SMART_LISTS } from "@/lib/contactSmartLists";
import { useContacts } from "@/hooks/useContacts";
import { useOpenContactTasksForUser } from "@/hooks/useContactTasks";
import { useListings } from "@/hooks/useListings";
import { useDataHealth } from "@/hooks/useDataHealth";
import { useDailyTouchSummary, useWeeklyTouchSummary } from "@/hooks/useTouches";
import { useNotifications, useMarkNotificationRead, useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useNotificationDigest } from "@/hooks/useNotificationDigest";
import { TouchScorecard } from "@/components/dashboard/TouchScorecard";
import { notificationKindIcon } from "@/lib/notificationPresentation";

function notificationPriorityDot(priority: string) {
  if (priority === "urgent") return "bg-red-500";
  if (priority === "action_required") return "bg-amber-500";
  return "bg-sky-500";
}

type PriorityTileProps = {
  to: string;
  label: string;
  sub?: string;
  count: number | null;
  icon: typeof Flame;
  emphasize?: boolean;
};

function PriorityTile({ to, label, sub, count, icon: Icon, emphasize }: PriorityTileProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "h-auto min-h-[4.25rem] w-full flex-col items-stretch gap-1 p-3 text-left border-border/80 bg-card/50 hover:bg-accent/40",
        emphasize && count != null && count > 0 && "border-primary/40 bg-primary/5",
      )}
      asChild
    >
      <Link to={to}>
        <span className="flex w-full items-start justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium text-foreground leading-tight">{label}</span>
          </span>
          {count != null ? (
            <Badge variant="secondary" className="tabular-nums shrink-0 font-semibold">
              {count}
            </Badge>
          ) : null}
        </span>
        {sub ? <span className="text-[11px] text-muted-foreground pl-6 leading-snug">{sub}</span> : null}
        <span className="flex items-center gap-0.5 text-[11px] text-primary pl-6">
          Open <ChevronRight className="h-3 w-3" />
        </span>
      </Link>
    </Button>
  );
}

export function DashboardCommandCenter() {
  useNotificationDigest();

  const navigate = useNavigate();
  const { data: recentNotifs = [] } = useNotifications(6);
  const markNotifRead = useMarkNotificationRead();

  const { data: contacts = [] } = useContacts();
  const { data: openTasks = [] } = useOpenContactTasksForUser();
  const { data: listings = [] } = useListings();
  const { data: dataHealth } = useDataHealth();
  const { data: dailyTouches = [] } = useDailyTouchSummary();
  const { data: weeklyTouches = [] } = useWeeklyTouchSummary();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const healthScore = Math.max(0, Math.min(100, Math.round(Number(dataHealth?.health_score ?? 0))));

  const hotLeadCount = useMemo(
    () =>
      contacts.filter((c) => {
        const cat = String(c.contact_category ?? "").toLowerCase();
        if (cat === "hot_lead") return true;
        const temp = String(c.lead_temperature ?? "").toLowerCase();
        return temp.includes("hot");
      }).length,
    [contacts],
  );

  const overdueTaskCount = useMemo(() => {
    const now = Date.now();
    return openTasks.filter((t) => {
      if (!t.due_at) return false;
      const tms = new Date(t.due_at).getTime();
      return tms < now;
    }).length;
  }, [openTasks]);

  const staleContactCount = useMemo(
    () =>
      contacts.filter((c) => {
        const days = getDaysSinceLastTouch(c);
        return days != null && days > 30;
      }).length,
    [contacts],
  );

  const noNextTouchCount = useMemo(
    () => contacts.filter((c) => !(c as { next_touch_date?: string | null }).next_touch_date).length,
    [contacts],
  );

  const todayTouchCount = dailyTouches.reduce((sum, row) => sum + Number(row.completed ?? 0), 0);

  const smartListChips = CONTACT_SMART_LISTS.filter((s) => s.id !== "all");

  return (
    <Card className="zoho-card p-4 border-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Command center
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Priority counts and smart lists — each tile opens the filtered view or screen behind it.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs shrink-0 self-start" asChild>
          <Link to="/attention-hub" className="gap-1">
            Full Daily Hub <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Do this next</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          <PriorityTile
            to="/contacts?smart=hot_lead"
            label="Hot leads"
            sub="Playbook + temperature"
            count={hotLeadCount}
            icon={Flame}
            emphasize
          />
          <PriorityTile
            to="/tasks"
            label="Overdue tasks"
            sub="Open contact tasks past due"
            count={overdueTaskCount}
            icon={ListTodo}
            emphasize
          />
          <PriorityTile
            to="/contacts?smart=stale"
            label="Stale contacts"
            sub="30+ days since last touch"
            count={staleContactCount}
            icon={Clock}
            emphasize
          />
          <PriorityTile
            to="/contacts?smart=no_next_touch"
            label="No next touch"
            sub="Missing next touch date"
            count={noNextTouchCount}
            icon={CalendarClock}
          />
          <PriorityTile
            to="/listings"
            label="Listings"
            sub="Pipeline board"
            count={listings.length}
            icon={Home}
          />
          <PriorityTile
            to="/data-health"
            label="Data health"
            sub={`${healthScore}% score · cleanup queues`}
            count={null}
            icon={Activity}
          />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Smart lists</p>
        <div className="flex flex-wrap gap-1.5">
          {smartListChips.map((s) => (
            <Button key={s.id} variant="secondary" size="sm" className="h-7 text-xs font-normal" asChild>
              <Link to={`/contacts?smart=${s.id}`}>{s.short ?? s.label}</Link>
            </Button>
          ))}
        </div>
      </div>

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
