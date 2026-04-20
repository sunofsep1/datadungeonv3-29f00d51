import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Cake,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Clock,
  Flame,
  Home,
  ListTodo,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDaysSinceLastTouch } from "@/lib/contactLastTouch";
import { CONTACT_SMART_LISTS } from "@/lib/contactSmartLists";
import { isBirthdayWithinDays } from "@/lib/contactBirthday";
import { isAnnualReviewSchedulingCandidate } from "@/lib/annualReviewCandidates";
import { useContacts } from "@/hooks/useContacts";
import { useOpenContactTasksForUser } from "@/hooks/useContactTasks";
import { useListings } from "@/hooks/useListings";
import { useDataHealth } from "@/hooks/useDataHealth";
import { useAnnualReviewContactStatusMap } from "@/hooks/useAnnualReviews";

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

/**
 * Priority counts + smart-list chips shared by Home dashboard and Daily Hub.
 */
export function DailyHubPriorityAndSmartLists() {
  const reviewYear = new Date().getFullYear();
  const { data: contacts = [] } = useContacts();
  const { data: openTasks = [] } = useOpenContactTasksForUser();
  const { data: listings = [] } = useListings();
  const { data: dataHealth } = useDataHealth();
  const { data: reviewStatusByContact = new Map<string, string>() } = useAnnualReviewContactStatusMap(reviewYear);

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

  const birthdayUpcomingCount = useMemo(
    () => contacts.filter((c) => isBirthdayWithinDays(c as { date_of_birth?: string | null }, 30)).length,
    [contacts],
  );

  const annualReviewCandidateCount = useMemo(
    () =>
      contacts.filter((c) =>
        isAnnualReviewSchedulingCandidate(
          (c as { contact_category?: string | null }).contact_category,
          reviewStatusByContact.get(c.id),
        ),
      ).length,
    [contacts, reviewStatusByContact],
  );

  const smartListChips = CONTACT_SMART_LISTS.filter((s) => s.id !== "all");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Do this next
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Each tile opens the filtered list or screen behind it.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
          to="/contacts?smart=birthdays_upcoming"
          label="Birthdays"
          sub="Next 30 days (set date of birth on contacts)"
          count={birthdayUpcomingCount}
          icon={Cake}
          emphasize={birthdayUpcomingCount > 0}
        />
        <PriorityTile
          to="/contacts?smart=annual_review_candidates"
          label="Review pool"
          sub="Top 100 & past clients — schedule January reviews"
          count={annualReviewCandidateCount}
          icon={ClipboardList}
          emphasize={annualReviewCandidateCount > 0}
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
    </div>
  );
}
