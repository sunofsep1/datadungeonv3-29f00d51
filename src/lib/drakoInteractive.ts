import type { DrakoMood } from "@/components/drako/types";
import { COMPANION_PX } from "@/components/drako/types";

/** The four live-action loops — click cycles through these. */
export const DRAKO_VIDEO_CYCLE: DrakoMood[] = [
  "sleeping",
  "celebrate",
  "fire-breath",
  "coffee-break",
];

/** Route/default moods that share a cycle clip — avoids "dead" first clicks on idle. */
const CYCLE_ALIASES: Partial<Record<DrakoMood, DrakoMood>> = {
  idle: "sleeping",
  thinking: "sleeping",
  confused: "sleeping",
  sad: "sleeping",
  wave: "celebrate",
  birthday: "celebrate",
  pointing: "celebrate",
  teacher: "celebrate",
  "growth-chart": "celebrate",
  working: "fire-breath",
};

export function normalizeCycleMood(mood: DrakoMood): DrakoMood {
  return CYCLE_ALIASES[mood] ?? mood;
}

export function nextCycleMood(current: DrakoMood): DrakoMood {
  const normalized = normalizeCycleMood(current);
  const idx = DRAKO_VIDEO_CYCLE.indexOf(normalized);
  const next = idx >= 0 ? (idx + 1) % DRAKO_VIDEO_CYCLE.length : 0;
  return DRAKO_VIDEO_CYCLE[next] ?? "sleeping";
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
};

export function pickTapLine(mood: DrakoMood): string {
  const pool = TAP_LINES[mood] ?? TAP_LINES.sleeping ?? ["Systems nominal."];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

export const DRAG_THRESHOLD_PX = 6;
