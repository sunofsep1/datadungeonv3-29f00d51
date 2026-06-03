import type { DrakoMood } from "@/components/drako/types";
import { COMPANION_PX } from "@/components/drako/types";

/** Full click cycle — lair + CRM companion (no PC/working clip). */
export const DRAKO_VIDEO_CYCLE: DrakoMood[] = [
  "play",
  "eat",
  "fly",
  "bounce",
  "sad",
  "celebrate",
  "fire-breath",
  "sleeping",
  "coffee-break",
];

/** Route/default moods that share a cycle clip — avoids dead first clicks. */
const CYCLE_ALIASES: Partial<Record<DrakoMood, DrakoMood>> = {
  idle: "bounce",
  thinking: "sleeping",
  working: "sleeping",
  confused: "sad",
  wave: "celebrate",
  birthday: "celebrate",
  pointing: "celebrate",
  teacher: "celebrate",
  "growth-chart": "celebrate",
};

function nextInCycle(current: DrakoMood, cycle: DrakoMood[]): DrakoMood {
  const normalized = CYCLE_ALIASES[current] ?? current;
  const idx = cycle.indexOf(normalized);
  const next = idx >= 0 ? (idx + 1) % cycle.length : 0;
  return cycle[next] ?? cycle[0] ?? "play";
}

export function normalizeCycleMood(mood: DrakoMood): DrakoMood {
  return CYCLE_ALIASES[mood] ?? mood;
}

export function nextCycleMood(current: DrakoMood): DrakoMood {
  return nextInCycle(current, DRAKO_VIDEO_CYCLE);
}

/** @deprecated Same as nextCycleMood — lair and CRM share one cycle. */
export function nextLairCycleMood(current: DrakoMood): DrakoMood {
  return nextCycleMood(current);
}

function parseSidebarWidthPx(): number {
  if (typeof window === "undefined") return 248;
  if (window.innerWidth < 768) return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--dd-sidebar-width").trim();
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 248;
}

export function clampDrakoPosition(x: number, y: number): { x: number; y: number } {
  const S = COMPANION_PX;
  const spriteH = Math.round(S * 0.75);
  const headerH = 60;
  const sidebarPx = parseSidebarWidthPx();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minX = sidebarPx + 8;
  const maxX = vw - S - 8;
  const minY = headerH + 4;
  const maxY = vh - spriteH - 16;
  return {
    x: Math.round(Math.min(maxX, Math.max(minX, x))),
    y: Math.round(Math.min(maxY, Math.max(minY, y))),
  };
}

const TAP_LINES: Partial<Record<DrakoMood, string[]>> = {
  sleeping: [
    "Standby mode… *whir* …oh. You rang?",
    "Power nap interrupted. This better be good.",
    "Boot sequence… loading attitude.",
  ],
  celebrate: [
    "HIGH SCORE! …for CRM hygiene.",
    "Level up! Insert coin to continue.",
    "Winner winner. Pixel dinner.",
  ],
  "fire-breath": [
    "Overclocked. Please stand back.",
    "Turbo mode engaged. Rad.",
    "Maximum flame. Totally tubular.",
  ],
  "coffee-break": [
    "Coffee break on the data deck.",
    "Caffeine subroutine: online.",
    "Loading java.exe…",
  ],
  play: [
    "Play mode! Don't touch the lava tiles.",
    "Recreation subroutine: fully unhinged.",
    "Tag! You're it, operator.",
  ],
  eat: [
    "Fuel intake detected. Delicious bytes.",
    "Om nom nom. CRM snacks hit different.",
    "Dragon diet: 90% data, 10% pizza.",
  ],
  fly: [
    "Altitude: maximum. Vibes: immaculate.",
    "Look ma, no wings—just pure sass.",
    "Cruising altitude: above your inbox.",
  ],
  bounce: [
    "Boing! Energy levels: illegal.",
    "Pogo mode activated. Hold on.",
    "Bouncing off the walls. Literally.",
  ],
  sad: [
    "Quiet day in the dungeon… let's fix that.",
    "Low battery emotionally. Pet the dragon?",
    "Even legends have slow Tuesdays.",
  ],
};

export function pickTapLine(mood: DrakoMood): string {
  const pool = TAP_LINES[mood] ?? TAP_LINES.sleeping ?? ["Systems nominal."];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

export const DRAG_THRESHOLD_PX = 6;
