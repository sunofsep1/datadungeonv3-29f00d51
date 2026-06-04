import { useEffect, useState } from "react";
import { DrakoSpriteImage } from "@/components/drako/DrakoSpriteImage";
import { DRAKO_ALT } from "@/components/drako/types";
import { getDrakoVideoSrcKey } from "@/components/drako/drakoVideos";
import { useLairDisplayMood } from "@/lib/drakoLairMood";
import { pickDrakoLine } from "@/lib/drakoDialogue";
import { Card } from "@/components/ui/card";
import { DrakoLairBackground } from "./DrakoLairBackground";

const LAIR_DRAKO_PX = 240;
const LAIR_DRAKO_H = Math.round(LAIR_DRAKO_PX * 0.75);

function bubbleForMood(mood: string): string {
  if (mood === "sleeping" || mood === "thinking" || mood === "coffee-break") {
    return pickDrakoLine("loading");
  }
  if (mood === "celebrate" || mood === "levelup") {
    return pickDrakoLine("celebrate");
  }
  return pickDrakoLine("guide");
}

export function DrakoLairDen() {
  const { mood, onVideoEnded } = useLairDisplayMood();
  const [bubble, setBubble] = useState(() => bubbleForMood(mood));

  useEffect(() => {
    setBubble(bubbleForMood(mood));
  }, [mood]);

  return (
    <Card className="h-full min-h-[420px] border-border/60 bg-card/80 overflow-hidden">
      <div className="relative flex flex-col h-full min-h-[420px]">
        <DrakoLairBackground />

        <div className="relative z-10 flex flex-col flex-1 min-h-[420px]">
          <div className="flex justify-center px-4 pt-5 pb-2">
            <div className="max-w-[260px] rounded-xl border border-border/80 bg-card/85 px-3 py-2 text-center text-xs font-medium shadow-lg backdrop-blur-sm">
              {bubble}
            </div>
          </div>

          <div className="flex-1" />

          {/* Feet on the center floor stone — object-[center_62%] on bg aligns here */}
          <div className="flex justify-center px-2 pb-2">
            <div
              className="flex items-end justify-center"
              style={{ width: LAIR_DRAKO_PX, height: LAIR_DRAKO_H, marginBottom: 4 }}
            >
              <DrakoSpriteImage
                key={`${mood}-${getDrakoVideoSrcKey(mood)}`}
                mood={mood}
                width={LAIR_DRAKO_PX}
                alt={DRAKO_ALT[mood]}
                onVideoEnded={onVideoEnded}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
