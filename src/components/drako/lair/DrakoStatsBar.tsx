import { useDrakoProgress } from "@/hooks/useDrakoProgress";
import { readStreak } from "@/lib/drakoStreak";

export function DrakoStatsBar() {
  const { level, totalXp, xpInLevel, xpSpan } = useDrakoProgress();
  const streak = readStreak();
  const pct = xpSpan > 0 ? Math.round((xpInLevel / xpSpan) * 100) : 100;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/60 bg-card/80 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Level</span>
        <span className="font-mono font-semibold text-primary">Lv.{level}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">XP</span>
        <span className="font-mono">{totalXp.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">({pct}% to next)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Streak</span>
        <span className="font-mono">
          {"🔥".repeat(Math.min(streak.current, 7)) || "—"}
          {streak.current > 0 && (
            <span className="ml-1 text-muted-foreground">{streak.current}d</span>
          )}
        </span>
      </div>
    </div>
  );
}
