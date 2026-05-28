import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface DrakoQuestStub {
  id: string;
  label: string;
  description: string;
  xpReward: number;
  link: string;
}

const DAILY_QUESTS: DrakoQuestStub[] = [
  {
    id: "hot-leads",
    label: "Call 2 hot leads",
    description: "Drako wants you on the phones — hot leads won't wait.",
    xpReward: 75,
    link: "/attention-hub",
  },
  {
    id: "log-touches",
    label: "Log 3 touches",
    description: "Every touch keeps the vault warm. Log three today.",
    xpReward: 50,
    link: "/contacts",
  },
  {
    id: "zero-overdue",
    label: "Clear overdue tasks",
    description: "Close the day with zero overdue tasks on your list.",
    xpReward: 100,
    link: "/tasks",
  },
];

export function DrakoQuestBoard() {
  return (
    <Card className="h-full border-border/60 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quest Board</CardTitle>
        <p className="text-xs text-muted-foreground">Daily missions — reset at midnight</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {DAILY_QUESTS.map((quest) => (
          <div
            key={quest.id}
            className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{quest.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{quest.description}</p>
              </div>
              <span className="shrink-0 text-xs font-mono text-primary">+{quest.xpReward} XP</span>
            </div>
            <Progress value={0} className="h-1.5" />
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to={quest.link}>Go</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
