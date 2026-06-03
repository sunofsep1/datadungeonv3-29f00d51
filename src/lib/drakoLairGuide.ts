import type { DrakoMood } from "@/components/drako/types";
import { getGuideLineForMood } from "@/components/drako/drakoVideos";
import { pickDrakoLine, type DrakoDialogueCategory } from "@/lib/drakoDialogue";

export const LAIR_TOUR_SEEN_KEY = "drako_lair_tour_v1";

export function hasSeenLairTour(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(LAIR_TOUR_SEEN_KEY) === "1";
}

export function markLairTourSeen(): void {
  localStorage.setItem(LAIR_TOUR_SEEN_KEY, "1");
}

export interface LairTourStep {
  id: string;
  line: string;
  mood?: DrakoMood;
}

export const LAIR_TOUR_STEPS: LairTourStep[] = [
  {
    id: "welcome",
    line: "Welcome to my lair, operator! I'm Drako — your dungeon guide.",
    mood: "wave",
  },
  {
    id: "quests",
    line: "See the Quest chip? Daily missions live there. Click it to expand.",
    mood: "pointing",
  },
  {
    id: "trophies",
    line: "Trophy Wall on the other side — achievements and bragging rights.",
    mood: "celebrate",
  },
  {
    id: "explore",
    line: "I'll wander around while you work. Toggle my voice in Settings anytime.",
    mood: "play",
  },
];

export function lineForHudPanel(panel: "quests" | "trophies"): string {
  if (panel === "quests") {
    return pickDrakoLine("lairQuest");
  }
  return pickDrakoLine("lairTrophy");
}

export function lineForBehaviorMood(mood: DrakoMood): string {
  return getGuideLineForMood(mood) ?? pickDrakoLine("guide");
}

export function periodicBanterLine(): string {
  return pickDrakoLine("lairTour");
}

export function categoryLine(category: DrakoDialogueCategory): string {
  return pickDrakoLine(category);
}
