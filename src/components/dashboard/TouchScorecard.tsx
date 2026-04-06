import { Link } from "react-router-dom";
import { Bell, Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DailyTouchSummaryRow, WeeklyTouchSummaryRow } from "@/hooks/useTouches";
import { openLogTouch } from "@/lib/openLogTouch";
import { cn } from "@/lib/utils";

function formatTouchLabel(touchType: string): string {
  return touchType
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function dailyRow(daily: DailyTouchSummaryRow[], touchType: string): DailyTouchSummaryRow | undefined {
  return daily.find((r) => r.touch_type === touchType);
}

function weeklyRow(weekly: WeeklyTouchSummaryRow[], touchType: string): WeeklyTouchSummaryRow | undefined {
  return weekly.find((r) => r.touch_type === touchType);
}

type CellProps = {
  label: string;
  completed: number;
  target: number | null;
  className?: string;
};

function ScoreCell({ label, completed, target, className }: CellProps) {
  const hasTarget = target != null && target > 0;
  const met = hasTarget && completed >= (target as number);
  return (
    <div
      className={cn(
        "rounded-md border border-border/70 bg-card/50 px-2.5 py-2 min-h-[3.25rem] flex flex-col justify-center",
        met && "border-emerald-500/35 bg-emerald-500/5",
        className,
      )}
    >
      <p className="text-[10px] text-muted-foreground leading-tight mb-0.5 line-clamp-2">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {completed}
        {hasTarget ? <span className="text-muted-foreground font-normal">/{target}</span> : null}
      </p>
    </div>
  );
}

type Props = {
  dailyTouches: DailyTouchSummaryRow[];
  weeklyTouches: WeeklyTouchSummaryRow[];
  todayTotalTouches: number;
  unreadCount: number;
};

export function TouchScorecard({ dailyTouches, weeklyTouches, todayTotalTouches, unreadCount }: Props) {
  const cardsToday = dailyRow(dailyTouches, "handwritten_card");
  const breakToday = dailyRow(dailyTouches, "break_bread");
  const emailToday = dailyRow(dailyTouches, "weekly_email");

  const breakWeek = weeklyRow(weeklyTouches, "break_bread");
  const videoWeek = weeklyRow(weeklyTouches, "housing_update_video");
  const emailWeek = weeklyRow(weeklyTouches, "weekly_email");

  return (
    <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-3 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Touch scorecard</p>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0 self-start" onClick={() => openLogTouch()}>
          <Handshake className="h-3.5 w-3.5" />
          Log touch
        </Button>
      </div>

      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Today</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <ScoreCell
            label="Handwritten cards"
            completed={Number(cardsToday?.completed ?? 0)}
            target={cardsToday?.daily_target ?? 2}
          />
          <ScoreCell
            label="Break bread"
            completed={Number(breakToday?.completed ?? 0)}
            target={breakToday?.daily_target ?? 1}
          />
          <ScoreCell
            label="Weekly email"
            completed={Number(emailToday?.completed ?? 0)}
            target={emailToday?.daily_target ?? 1}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-1.5">This week</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <ScoreCell
            label="Break bread"
            completed={Number(breakWeek?.completed ?? 0)}
            target={breakWeek?.weekly_target ?? 5}
          />
          <ScoreCell
            label="Housing update video"
            completed={Number(videoWeek?.completed ?? 0)}
            target={videoWeek?.weekly_target ?? 1}
          />
          <ScoreCell
            label="Weekly email"
            completed={Number(emailWeek?.completed ?? 0)}
            target={emailWeek?.weekly_target ?? 1}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
        <span>
          <span className="text-foreground font-medium">{todayTotalTouches}</span> touches logged today
          {dailyTouches.length > 0 ? (
            <span className="hidden sm:inline">
              {" "}
              ·{" "}
              {dailyTouches.slice(0, 4).map((row) => (
                <span key={row.touch_type} className="mr-2">
                  {formatTouchLabel(row.touch_type)} {row.completed}
                  {row.daily_target != null ? `/${row.daily_target}` : ""}
                </span>
              ))}
            </span>
          ) : null}
        </span>
        <Link to="/settings#settings-notifications" className="inline-flex items-center gap-1 text-primary hover:underline">
          <Bell className="h-3.5 w-3.5" />
          {unreadCount} unread
        </Link>
      </div>
    </div>
  );
}
