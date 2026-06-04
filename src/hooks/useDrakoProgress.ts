/**
 * useDrakoProgress
 * React hook for the Drako XP & levels system.
 *
 * Usage:
 *   const { level, xpInLevel, xpSpan, grantXp } = useDrakoProgress();
 *   // On task complete:
 *   grantXp("taskDone");
 *
 * When a level-up occurs the hook fires:
 *   setMood("fire-breath", { caption: <level-up line> })
 *
 * The hook subscribes to a custom DOM event ("drako:xp-updated") so that
 * multiple components can read the live XP state without prop-drilling.
 */

import { useCallback, useEffect, useState } from "react";
import { useDrako } from "@/components/drako";
import { pickDrakoLine } from "@/lib/drakoDialogue";
import {
  grantXpToStorage,
  readProgress,
  xpInCurrentLevel,
  xpSpanOfLevel,
  type XpSource,
} from "@/lib/drakoProgress";
import { dispatchDrakoLevelUp } from "@/lib/drakoLairMood";
import { readGameModeEnabled } from "@/lib/gameModePrefs";

// Custom event dispatched whenever XP changes so all hook instances re-sync.
const XP_EVENT = "drako:xp-updated";

function dispatchXpEvent() {
  window.dispatchEvent(new Event(XP_EVENT));
}

export interface DrakoProgressHookValue {
  /** Current level (1-based). */
  level: number;
  /** Total cumulative XP. */
  totalXp: number;
  /** XP earned within the current level band (for progress bar numerator). */
  xpInLevel: number;
  /** Total XP span of the current level band (for progress bar denominator). */
  xpSpan: number;
  /** Grant XP for a source event; triggers Drako reaction on level-up. */
  grantXp: (source: XpSource) => void;
}

export function useDrakoProgress(): DrakoProgressHookValue {
  const { setMood } = useDrako();

  const [progressState, setProgressState] = useState(() => readProgress());

  // Re-sync whenever any hook instance grants XP.
  useEffect(() => {
    const onXpUpdate = () => setProgressState(readProgress());
    window.addEventListener(XP_EVENT, onXpUpdate);
    return () => window.removeEventListener(XP_EVENT, onXpUpdate);
  }, []);

  const grantXp = useCallback(
    (source: XpSource) => {
      if (!readGameModeEnabled()) return;
      const result = grantXpToStorage(source);
      setProgressState(result.state);
      dispatchXpEvent();

      if (result.leveledUp) {
        dispatchDrakoLevelUp();
        // Small delay so the CRM action's own Drako reaction fires first,
        // then the level-up blaze follows ~600 ms later.
        setTimeout(() => {
          setMood("fire-breath", {
            caption: pickDrakoLine("levelUp"),
          });
        }, 600);
      }
    },
    [setMood],
  );

  const { totalXp, level } = progressState;

  return {
    level,
    totalXp,
    xpInLevel: xpInCurrentLevel(totalXp, level),
    xpSpan: xpSpanOfLevel(level),
    grantXp,
  };
}
