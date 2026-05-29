import { cn } from "@/lib/utils";
import { useDrakoProgress } from "@/hooks/useDrakoProgress";
import { readStreak } from "@/lib/drakoStreak";

interface AchievementDef {
  id: string;
  label: string;
  emoji: string;
  /** How it's earned — shown on hover. */
  hint: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-blood", label: "First Blood", emoji: "🔥", hint: "Earn your first XP" },
  { id: "century-club", label: "Century Club", emoji: "💯", hint: "Bank 1,000 total XP" },
  { id: "on-a-roll", label: "On a Roll", emoji: "🔁", hint: "Hit a 3-day streak" },
  { id: "7-day-blaze", label: "7-Day Blaze", emoji: "⚡", hint: "Hit a 7-day streak" },
  { id: "seasoned", label: "Seasoned", emoji: "🛡️", hint: "Reach level 5" },
  { id: "dragon-master", label: "Dragon Master", emoji: "🐉", hint: "Reach level 10" },
];

interface TrophyContext {
  level: number;
  totalXp: number;
  longestStreak: number;
}

function isEarned(id: string, ctx: TrophyContext): boolean {
  switch (id) {
    case "first-blood":
      return ctx.totalXp > 0;
    case "century-club":
      return ctx.totalXp >= 1000;
    case "on-a-roll":
      return ctx.longestStreak >= 3;
    case "7-day-blaze":
      return ctx.longestStreak >= 7;
    case "seasoned":
      return ctx.level >= 5;
    case "dragon-master":
      return ctx.level >= 10;
    default:
      return false;
  }
}

export function TrophyWallContent() {
  const { level, totalXp } = useDrakoProgress();
  const streak = readStreak();
  const ctx: TrophyContext = { level, totalXp, longestStreak: streak.longest };

  return (
    <div className="drako-trophy-grid">
      {ACHIEVEMENTS.map((a) => {
        const earned = isEarned(a.id, ctx);
        return (
          <div
            key={a.id}
            className={cn("drako-trophy-slot", earned && "drako-trophy-slot-earned")}
            title={`${a.label} — ${earned ? "Unlocked!" : a.hint}`}
          >
            <span className="drako-trophy-emoji">{a.emoji}</span>
            <span className="drako-trophy-label">{a.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DrakoTrophyWall() {
  return (
    <div className="drako-hud-shelf drako-hud-object-open p-3">
      <p className="drako-hud-kicker mb-2">TROPHY SHELF</p>
      <TrophyWallContent />
    </div>
  );
}
