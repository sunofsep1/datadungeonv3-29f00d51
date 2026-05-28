import { useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDrako } from "@/components/drako";
import { DrakoLairDen } from "@/components/drako/lair/DrakoLairDen";
import { DrakoQuestBoard } from "@/components/drako/lair/DrakoQuestBoard";
import { DrakoTrophyWall } from "@/components/drako/lair/DrakoTrophyWall";
import { DrakoStatsBar } from "@/components/drako/lair/DrakoStatsBar";
import { recordLairVisit } from "@/lib/drakoStreak";

export default function DrakoLair() {
  const { setPresence } = useDrako();

  useEffect(() => {
    setPresence("lair");
    recordLairVisit();
    return () => setPresence("companion");
  }, [setPresence]);

  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col gap-4 pb-6">
      <PageHeader
        title="Drako's Lair"
        description="Your dragon's home — quests, trophies, and daily streaks."
      />
      <DrakoStatsBar />
      <div className="grid flex-1 gap-4 lg:grid-cols-[1.2fr_1fr_0.9fr]">
        <DrakoLairDen />
        <DrakoQuestBoard />
        <DrakoTrophyWall />
      </div>
    </div>
  );
}
