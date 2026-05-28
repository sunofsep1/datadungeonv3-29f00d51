import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DRAKO_TROPHY_WALL_BG } from "./DrakoLairBackground";

interface AchievementDef {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-blood", label: "First Blood", emoji: "🔥", earned: false },
  { id: "century-club", label: "Century Club", emoji: "💯", earned: false },
  { id: "7-day-blaze", label: "7-Day Blaze", emoji: "⚡", earned: false },
  { id: "dragon-master", label: "Dragon Master", emoji: "🐉", earned: false },
  { id: "night-owl", label: "Night Owl", emoji: "🌙", earned: false },
  { id: "pipeline-king", label: "Pipeline King", emoji: "📈", earned: false },
];

export function DrakoTrophyWall() {
  return (
    <Card className="h-full border-border/60 bg-card/80 overflow-hidden">
      <div className="relative h-[72px] overflow-hidden border-b border-border/50">
        <img
          src={DRAKO_TROPHY_WALL_BG}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-[center_28%] opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-card/95" />
        <div className="relative z-10 px-4 py-3">
          <CardTitle className="text-base font-semibold text-foreground drop-shadow-sm">
            Trophy Wall
          </CardTitle>
          <p className="text-xs text-muted-foreground">Achievements & collectibles</p>
        </div>
      </div>
      <CardHeader className="sr-only">
        <CardTitle>Trophy Wall</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border p-3 text-center min-h-[88px]",
                a.earned
                  ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                  : "border-border/40 bg-muted/20 opacity-50 grayscale",
              )}
            >
              <span className="text-2xl mb-1">{a.emoji}</span>
              <span className="text-[10px] font-medium leading-tight">{a.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
