import type { DrakoVideoKey } from "@/lib/drakoVideoKey";
import type { DrakoMood } from "./types";

const BASE = "/drako/videos";

/** OpenArt export uses off-white grey-blue — keyed in canvas at runtime. */
const LIGHT_MATTE: DrakoVideoKey = {
  key: [233, 243, 249],
  similarity: 52,
  blend: 20,
};

/** Green-screen clip only — idle uses light matte to avoid green flicker. */
const GREEN_MATTE: DrakoVideoKey = {
  key: [28, 127, 69],
  similarity: 85,
  blend: 22,
  green: true,
};

export interface DrakoVideoAsset {
  src: string;
  key: DrakoVideoKey;
}

const ASSETS = {
  celebrate: { src: `${BASE}/drako-celebrate.mp4`, key: LIGHT_MATTE },
  fireBreath: { src: `${BASE}/drako-fire-breath.mp4`, key: LIGHT_MATTE },
  sleeping: { src: `${BASE}/drako-sleeping.mp4`, key: LIGHT_MATTE },
  coffee: { src: `${BASE}/drako-coffee-break.mp4`, key: GREEN_MATTE },
} as const satisfies Record<string, DrakoVideoAsset>;

export const DRAKO_VIDEO_BY_MOOD: Partial<Record<DrakoMood, DrakoVideoAsset>> = {
  idle: ASSETS.sleeping,
  wave: ASSETS.celebrate,
  celebrate: ASSETS.celebrate,
  birthday: ASSETS.celebrate,
  "fire-breath": ASSETS.fireBreath,
  sleeping: ASSETS.sleeping,
  "coffee-break": ASSETS.coffee,
  thinking: ASSETS.sleeping,
  working: ASSETS.fireBreath,
  pointing: ASSETS.celebrate,
  teacher: ASSETS.celebrate,
  "growth-chart": ASSETS.celebrate,
  confused: ASSETS.sleeping,
  sad: ASSETS.sleeping,
};

export function getDrakoVideoAsset(mood: DrakoMood): DrakoVideoAsset | null {
  return DRAKO_VIDEO_BY_MOOD[mood] ?? DRAKO_VIDEO_BY_MOOD.idle ?? null;
}

/** Stable key for video element — moods sharing a clip won't remount. */
export function getDrakoVideoSrcKey(mood: DrakoMood): string {
  return getDrakoVideoAsset(mood)?.src ?? mood;
}

/** @deprecated Use getDrakoVideoAsset — kept for callers that only need src. */
export function getDrakoVideoSrc(mood: DrakoMood): string | null {
  return getDrakoVideoAsset(mood)?.src ?? null;
}
