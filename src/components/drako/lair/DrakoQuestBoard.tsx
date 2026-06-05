import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDrakoActivity } from "@/hooks/useDrakoActivity";
import type { DrakoActivityKind } from "@/lib/drakoActivity";

export interface DrakoQuestStub {
  id: string;
  label: string;
  description: string;
  xpReward: number;
  link: string;
  /** Activity that advances this quest. */
  kind: DrakoActivityKind;
  /** How many of that activity completes the quest today. */
  target: number;
}

export const DAILY_QUESTS: DrakoQuestStub[] = [
  {
    id: "training",
    label: "Train with Drako",
    description: "Run a trial — objections, compliance, negotiation. Earn XP.",
    xpReward: 50,
    link: "/training",
    kind: "training",
    target: 1,
  },
  {
    id: "calls",
    label: "Call 2 contacts",
    description: "Drako wants you on the phones — pick two from your list today.",
    xpReward: 75,
    link: "/contacts",
    kind: "call",
    target: 2,
  },
  {
    id: "log-touches",
    label: "Log 3 touches",
    description: "Every touch keeps the vault warm. Log three today.",
    xpReward: 50,
    link: "/contacts",
    kind: "touch",
    target: 3,
  },
  {
    id: "clear-tasks",
    label: "Clear 3 tasks",
    description: "Close the day by knocking three actions off your queue.",
    xpReward: 100,
    link: "/attention-hub",
    kind: "taskComplete",
    target: 3,
  },
];

export function QuestBoardContent() {
  const activity = useDrakoActivity();

  return (
    <div className="space-y-2">
      {DAILY_QUESTS.map((quest, i) => {
        const done = Math.min(activity[quest.kind] ?? 0, quest.target);
        const complete = done >= quest.target;
        const pct = Math.round((done / quest.target) * 100);
        return (
          <div key={quest.id} className={cn("drako-quest-row", complete && "drako-quest-row-done")}>
            <div className="drako-quest-row-head">
              <span className="drako-quest-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="drako-quest-title">{quest.label}</p>
                <p className="drako-quest-desc">{quest.description}</p>
              </div>
              <span className="drako-quest-xp">+{quest.xpReward}</span>
            </div>
            <div className="drako-quest-bar" aria-hidden>
              <span className="drako-quest-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            {complete ? (
              <span className="drako-quest-go drako-quest-go-done">
                ✓ {done}/{quest.target} DONE
              </span>
            ) : (
              <Link to={quest.link} className="drako-quest-go">
                {done}/{quest.target} ▶ GO
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DrakoQuestBoard() {
  return (
    <div className="drako-hud-scroll drako-hud-object-open p-3">
      <p className="drako-hud-kicker mb-2">DAILY MISSIONS</p>
      <QuestBoardContent />
    </div>
  );
}
