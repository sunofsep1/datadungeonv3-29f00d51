import type { DrakoMood } from "@/components/drako/types";

export type DrakoDialogueCategory =
  | "celebrate"
  | "empty"
  | "loading"
  | "guide"
  | "urgent"
  | "taskDone"
  | "nurtureStep"
  | "touchLogged"
  | "contactSaved"
  | "dealClosed"
  | "pipeline"
  | "hotLeads"
  | "levelUp"
  | "lairTour"
  | "lairQuest"
  | "lairTrophy";

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
  touchLogged: [
    "Touch logged. +30 XP — the vault stays warm.",
    "Contact pinged. Relationship meter rising.",
    "Logged it. Consistency is your superpower, operator.",
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
  levelUp: [
    "LEVEL UP! New power unlocked. The dungeon bows.",
    "Rank increase detected. Dragon fire intensifies.",
    "XP threshold breached. You just got stronger.",
    "New level achieved. Insert congratulations here.",
    "Status upgrade complete. Operator clearance elevated.",
  ],
  lairTour: [
    "This is my lair — your command centre for quests and trophies.",
    "I'll roam around while you work. Check the HUD corners for missions.",
    "The dungeon is yours, operator. I'm just the tour guide.",
    "Keep your streak alive — visit me daily for bonus vibes.",
  ],
  lairQuest: [
    "Quest Board online. Pick a mission and earn XP.",
    "Daily quests reset at midnight. Don't leave loot on the table.",
    "Three missions waiting. Which one first, operator?",
  ],
  lairTrophy: [
    "Trophy Wall — proof you run this territory.",
    "Achievements unlock as you level up. Collect them all.",
    "Empty slots mean opportunity. Go earn some trophies.",
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
  touchLogged: "celebrate",
  contactSaved: "wave",
  dealClosed: "fire-breath",
  pipeline: "growth-chart",
  hotLeads: "fire-breath",
  levelUp: "fire-breath",
  lairTour: "wave",
  lairQuest: "pointing",
  lairTrophy: "celebrate",
};
