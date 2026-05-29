import { useCallback, useEffect, useState } from "react";
import type { DrakoMood } from "@/components/drako/types";
import { getDrakoVideoAsset } from "@/components/drako/drakoVideos";

/** Lair-only mood schedule — does not affect the floating companion. */
export function getLairMoodByTimeOfDay(date = new Date()): DrakoMood {
  const hour = date.getHours();

  if (hour < 6) return "sleeping";
  if (hour < 9) return "coffee-break";
  if (hour < 12) return "wave";
  if (hour < 14) return "play";
  if (hour < 18) return "idle";
  if (hour < 21) return "celebrate";
  return "thinking";
}

export function useLairMood(): DrakoMood {
  const [mood, setMood] = useState<DrakoMood>(() => getLairMoodByTimeOfDay());

  const refresh = useCallback(() => {
    setMood(getLairMoodByTimeOfDay());
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return mood;
}

export const LEVEL_UP_EVENT = "drako:level-up";

export function dispatchDrakoLevelUp(): void {
  window.dispatchEvent(new Event(LEVEL_UP_EVENT));
}

export function useLairDisplayMood(): {
  mood: DrakoMood;
  onVideoEnded?: () => void;
} {
  const baseMood = useLairMood();
  const [override, setOverride] = useState<DrakoMood | null>(null);

  useEffect(() => {
    const onLevelUp = () => setOverride("levelup");
    window.addEventListener(LEVEL_UP_EVENT, onLevelUp);
    return () => window.removeEventListener(LEVEL_UP_EVENT, onLevelUp);
  }, []);

  const handleOneShotEnded = useCallback(() => {
    setOverride(null);
  }, []);

  const mood = override ?? baseMood;
  const asset = getDrakoVideoAsset(mood);
  const onVideoEnded =
    override && asset?.loop === false ? handleOneShotEnded : undefined;

  return { mood, onVideoEnded };
}
