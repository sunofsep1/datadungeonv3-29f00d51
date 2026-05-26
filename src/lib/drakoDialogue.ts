import type { DrakoMood } from "@/components/drako/types";

export type DrakoDialogueCategory =
  | "celebrate"
  | "empty"
  | "loading"
  | "guide"
  | "urgent"
  | "taskDone"
  | "nurtureStep"
  | "contactSaved"
  | "dealClosed"
  | "pipeline"
  | "hotLeads";

/** Retro 80s arcade / CRT dungeon — no Aussie slang. */
const LINES: Record<DrakoDialogueCategory, string[]> = {
  celebrate: [
    "HIGH SCORE! That task just got deleted from the queue.",
    "Player one wins. Pipeline status: glowing.",
    "Achievement unlocked. Don't stop now — next level awaits.",
    "Radical. The dungeon database approves.",
    "Bonus points! Keep that combo going.",
  ],
  empty: [
    "Sector empty. Insert first contact to begin game.",
    "No data detected. The dungeon echoes… add someone?",
    "Zero entries in this buffer. Time to populate.",
    "Blank slate. Even dragons get lonely in an empty ROM.",
    "Nothing on the radar. Load up your contact roster.",
  ],
  loading: [
    "Loading… please wait. *disk whir*",
    "Fetching data from the vault. Stand by.",
    "Buffering… good bytes take a second.",
    "Spinning up the dungeon drives…",
    "One sec — even 8-bit dragons need fetch time.",
  ],
  guide: [
    "Welcome, operator. I'm Drako — your dungeon guide.",
    "Command centre online. Everything urgent lives here.",
    "Your contact grid. These are your party members.",
    "Deal pipeline engaged. Move stages or the boss fight gets harder.",
  ],
  urgent: [
    "Alert! Overdue task in memory bank. Handle it.",
    "Priority flag raised. This one's been waiting too long.",
    "Stale deal detected. Advance or archive — your call.",
  ],
  taskDone: [
    "Task cleared. +100 XP to productivity.",
    "Deleted from the queue. Nice reflexes.",
    "Objective complete. Save state recommended.",
  ],
  nurtureStep: [
    "Nurture sequence advanced. Auto-pilot engaged.",
    "Drip campaign ticked forward. Systems green.",
    "Sequence step sent. The dungeon runs itself.",
  ],
  contactSaved: [
    "Contact saved to permanent memory.",
    "New entry written to the vault. Solid.",
    "Profile locked in. Database happy.",
  ],
  dealClosed: [
    "DEAL CLOSED. Insert victory fanfare here.",
    "Transaction complete. Boss defeated.",
    "Sale logged. The dungeon celebrates in silence.",
  ],
  pipeline: [
    "Stage advanced. Chart trending upward.",
    "Pipeline level up. Keep pushing.",
    "Progress bar moved. Most excellent.",
  ],
  hotLeads: [
    "Hot leads on scope. These need you today.",
    "Priority targets acquired. Engage now.",
    "Heat signature detected. Move fast, operator.",
  ],
};

export function pickDrakoLine(category: DrakoDialogueCategory, seed?: number): string {
  const pool = LINES[category];
  if (!pool.length) return "";
  const i = seed !== undefined ? seed % pool.length : Math.floor(Math.random() * pool.length);
  return pool[i] ?? pool[0];
}

export const CATEGORY_MOOD: Record<DrakoDialogueCategory, DrakoMood> = {
  celebrate: "celebrate",
  empty: "sleeping",
  loading: "thinking",
  guide: "wave",
  urgent: "confused",
  taskDone: "celebrate",
  nurtureStep: "wave",
  contactSaved: "wave",
  dealClosed: "fire-breath",
  pipeline: "growth-chart",
  hotLeads: "fire-breath",
};
