import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useDrako } from "@/components/drako";
import { DrakoLairScene } from "@/components/drako/lair/DrakoLairScene";
import { useGameMode } from "@/hooks/useGameMode";
import { recordLairVisit } from "@/lib/drakoStreak";

export default function DrakoLair() {
  const { setPresence } = useDrako();
  const { gameModeEnabled } = useGameMode();

  useEffect(() => {
    if (!gameModeEnabled) return;
    setPresence("lair");
    recordLairVisit();
    return () => setPresence("companion");
  }, [setPresence, gameModeEnabled]);

  if (!gameModeEnabled) {
    return <Navigate to="/attention-hub" replace />;
  }

  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col">
      <DrakoLairScene />
    </div>
  );
}
