import type { LairBehavior } from "@/components/drako/drakoVideos";
import type { DrakoMood } from "@/components/drako/types";

export interface LairBounds {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  spriteW: number;
  spriteH: number;
}

export const BEHAVIOR_MOODS: Record<LairBehavior, DrakoMood> = {
  wander: "bounce",
  sleep: "sleeping",
  play: "play",
  eat: "eat",
  fly: "fly",
  talk: "wave",
};

export const ACTIVE_BEHAVIORS: LairBehavior[] = ["sleep", "play", "eat", "fly", "talk"];

export function clampLairPosition(
  x: number,
  y: number,
  bounds: LairBounds,
): { x: number; y: number } {
  const minX = bounds.paddingLeft;
  const maxX = Math.max(minX, bounds.width - bounds.paddingRight - bounds.spriteW);
  const minY = bounds.paddingTop;
  const maxY = Math.max(minY, bounds.height - bounds.paddingBottom - bounds.spriteH);
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}

export function randomWaypoint(bounds: LairBounds): { x: number; y: number } {
  const minX = bounds.paddingLeft;
  const maxX = Math.max(minX, bounds.width - bounds.paddingRight - bounds.spriteW);
  const minY = bounds.paddingTop;
  const maxY = Math.max(minY, bounds.height - bounds.paddingBottom - bounds.spriteH);
  const spanX = Math.max(0, maxX - minX);
  const spanY = Math.max(0, maxY - minY);
  return {
    x: minX + Math.random() * spanX,
    y: minY + Math.random() * spanY,
  };
}

export function pickNextBehavior(current: LairBehavior): LairBehavior {
  const pool = ACTIVE_BEHAVIORS.filter((b) => b !== current);
  return pool[Math.floor(Math.random() * pool.length)] ?? "talk";
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
