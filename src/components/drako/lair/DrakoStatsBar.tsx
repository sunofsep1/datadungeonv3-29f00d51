import { cn } from "@/lib/utils";
import { useDrakoProgress } from "@/hooks/useDrakoProgress";
import { readStreak } from "@/lib/drakoStreak";

export function DrakoStatsBar({ className }: { className?: string }) {
  const { level, totalXp, xpInLevel, xpSpan } = useDrakoProgress();
  const streak = readStreak();
  const pct = xpSpan > 0 ? Math.round((xpInLevel / xpSpan) * 100) : 100;

  return (
    <div className={cn("drako-hud-stats", className)}>
      <div className="drako-hud-stat">
        <span className="drako-hud-stat-key">LV</span>
        <span className="drako-hud-stat-val">{level}</span>
      </div>
      <div className="drako-hud-stat drako-hud-stat-xp">
        <span className="drako-hud-stat-key">XP</span>
        <span className="drako-hud-stat-val">{totalXp.toLocaleString()}</span>
        <div className="drako-hud-xp-track" aria-hidden>
          <span className="drako-hud-xp-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="drako-hud-stat">
        <span className="drako-hud-stat-key">STR</span>
        <span className="drako-hud-stat-val">
          {streak.current > 0 ? `${streak.current}d` : "—"}
        </span>
      </div>
    </div>
  );
}
