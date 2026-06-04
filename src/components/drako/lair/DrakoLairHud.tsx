import { useState } from "react";
import { cn } from "@/lib/utils";
import { DrakoStatsBar } from "./DrakoStatsBar";
import { DAILY_QUESTS, QuestBoardContent } from "./DrakoQuestBoard";
import { ACHIEVEMENTS, TrophyWallContent } from "./DrakoTrophyWall";
import { lineForHudPanel } from "@/lib/drakoLairGuide";
import type { DrakoMood } from "@/components/drako/types";

type HudPanel = "quests" | "trophies" | null;

interface DrakoLairHudProps {
  onPanelChange?: (panel: HudPanel) => void;
  onGuideLine?: (line: string, mood?: DrakoMood) => void;
}

function RetroHudObject({
  kind,
  label,
  count,
  expanded,
  onToggle,
  className,
  children,
}: {
  kind: "scroll" | "shelf";
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("pointer-events-auto absolute z-30", className)}>
      <div
        className={cn(
          "drako-hud-object",
          kind === "scroll" ? "drako-hud-scroll" : "drako-hud-shelf",
          expanded && "drako-hud-object-open",
        )}
      >
        <button type="button" onClick={onToggle} className="drako-hud-object-trigger">
          <span className="drako-hud-object-icon" aria-hidden>
            {kind === "scroll" ? "📜" : "🏆"}
          </span>
          <span className="drako-hud-object-label">{label}</span>
          <span className="drako-hud-object-count">{count}</span>
          <span className={cn("drako-hud-object-caret", expanded && "drako-hud-object-caret-open")}>
            ▼
          </span>
        </button>
        {expanded ? <div className="drako-hud-object-body">{children}</div> : null}
      </div>
    </div>
  );
}

export function DrakoLairHud({ onPanelChange, onGuideLine }: DrakoLairHudProps) {
  const [openPanel, setOpenPanel] = useState<HudPanel>(null);

  const toggle = (panel: "quests" | "trophies") => {
    const next = openPanel === panel ? null : panel;
    setOpenPanel(next);
    onPanelChange?.(next);
    if (next) {
      onGuideLine?.(lineForHudPanel(next), next === "quests" ? "pointing" : "celebrate");
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div className="absolute left-3 right-3 top-3 md:left-4 md:right-4 md:top-4">
        <DrakoStatsBar className="pointer-events-auto mx-auto max-w-xl" />
      </div>

      <RetroHudObject
        kind="scroll"
        label="QUESTS"
        count={DAILY_QUESTS.length}
        expanded={openPanel === "quests"}
        onToggle={() => toggle("quests")}
        className="left-3 top-[4.75rem] hidden md:block md:left-4 md:top-[4.5rem]"
      >
        <QuestBoardContent />
      </RetroHudObject>

      <RetroHudObject
        kind="shelf"
        label="TROPHIES"
        count={ACHIEVEMENTS.length}
        expanded={openPanel === "trophies"}
        onToggle={() => toggle("trophies")}
        className="right-3 top-[4.75rem] hidden md:block md:right-4 md:top-[4.5rem]"
      >
        <TrophyWallContent />
      </RetroHudObject>

      <RetroHudObject
        kind="scroll"
        label="QUESTS"
        count={DAILY_QUESTS.length}
        expanded={openPanel === "quests"}
        onToggle={() => toggle("quests")}
        className="bottom-4 left-3 md:hidden"
      >
        <QuestBoardContent />
      </RetroHudObject>

      <RetroHudObject
        kind="shelf"
        label="TROPHIES"
        count={ACHIEVEMENTS.length}
        expanded={openPanel === "trophies"}
        onToggle={() => toggle("trophies")}
        className="bottom-4 right-3 md:hidden"
      >
        <TrophyWallContent />
      </RetroHudObject>
    </div>
  );
}
