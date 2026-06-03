import { useMemo } from "react";
import { TouchScorecard } from "@/components/dashboard/TouchScorecard";
import { useDailyTouchSummary, useWeeklyTouchSummary } from "@/hooks/useTouches";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";

export function DailyHubTouchScorecard() {
  const { data: dailyTouches = [] } = useDailyTouchSummary();
  const { data: weeklyTouches = [] } = useWeeklyTouchSummary();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const todayTotalTouches = useMemo(
    () => dailyTouches.reduce((sum, row) => sum + Number(row.completed ?? 0), 0),
    [dailyTouches],
  );

  return (
    <TouchScorecard
      dailyTouches={dailyTouches}
      weeklyTouches={weeklyTouches}
      todayTotalTouches={todayTotalTouches}
      unreadCount={unreadCount}
    />
  );
}
