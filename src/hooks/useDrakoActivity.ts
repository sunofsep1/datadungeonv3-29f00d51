import { useEffect, useState } from "react";
import {
  DRAKO_ACTIVITY_EVENT,
  readDrakoActivityToday,
  type DrakoActivityCounts,
} from "@/lib/drakoActivity";

/**
 * Live view of today's Drako activity counts. Re-renders whenever any action
 * records new activity (so quest bars fill in real time).
 */
export function useDrakoActivity(): DrakoActivityCounts {
  const [counts, setCounts] = useState<DrakoActivityCounts>(() => readDrakoActivityToday());

  useEffect(() => {
    const onUpdate = () => setCounts(readDrakoActivityToday());
    window.addEventListener(DRAKO_ACTIVITY_EVENT, onUpdate);
    return () => window.removeEventListener(DRAKO_ACTIVITY_EVENT, onUpdate);
  }, []);

  return counts;
}
