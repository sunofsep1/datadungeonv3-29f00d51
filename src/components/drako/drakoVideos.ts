import type { DrakoVideoKey } from "@/lib/drakoVideoKey";
import type { DrakoMood } from "./types";

const BASE = "/drako/videos";
/** Bust browser cache when replacing MP4s in public/drako/videos/. */
const V = "?v=20260526d";

/** OpenArt near-white export (~#FCFCFC) — luminance key handles H.264 banding. */
const LIGHT_MATTE: DrakoVideoKey = {
  key: [252, 252, 252],
  similarity: 38,
  blend: 28,
};

/** Green-screen fire clip — tip soften + standard key. */
const GREEN_FIRE: DrakoVideoKey = {
  key: [32, 128, 68],
  similarity: 78,
  blend: 10,
  green: true,
  softenFlameTips: true,
  loopMarginS: 0.08,
};

/** Green-screen coffee clip — wider loop margin, defringe in post-pass. */
const GREEN_COFFEE: DrakoVideoKey = {
  key: [32, 128, 68],
  similarity: 78,
  blend: 10,
  green: true,
  loopMarginS: 0.12,
};

export interface DrakoVideoAsset {
  src: string;
  key: DrakoVideoKey;
}

const ASSETS = {
  celebrate: { src: `${BASE}/drako-celebrate.mp4${V}`, key: LIGHT_MATTE },
  fireBreath: { src: `${BASE}/drako-fire-breath.mp4${V}`, key: GREEN_FIRE },
  sleeping: { src: `${BASE}/drako-sleeping.mp4${V}`, key: LIGHT_MATTE },
  coffee: { src: `${BASE}/drako-coffee-break.mp4${V}`, key: GREEN_COFFEE },
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

const ALL_VIDEO_SRCS = [...new Set(Object.values(ASSETS).map((a) => a.src))];

/** Warm browser cache so mood switches don't flash empty frames. */
export function preloadDrakoVideos(): void {
  if (typeof document === "undefined") return;
  for (const src of ALL_VIDEO_SRCS) {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = src.split("?")[0];
    video.load();
  }
}
