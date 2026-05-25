import type { DrakoMood } from "@/components/drako";

export type DrakoDialogueCategory =
  | "celebrate"
  | "empty"
  | "loading"
  | "guide"
  | "urgent";

const LINES: Record<DrakoDialogueCategory, string[]> = {
  celebrate: [
    "Ripper! That one's gonna feel good on Friday. Who's next?",
    "Ohhh yeah. You're on a roll, mate.",
    "DEAL. CLOSED. I'd high-five you but — claws.",
    "That's what I'm talking about. Now don't let the pipeline go cold.",
    "Look at ya go. Dungeon's filling up nicely.",
  ],
  empty: [
    "Nothin' here but me and some dust. Add your first contact?",
    "Empty dungeon. Let's fix that — chuck in a contact.",
    "No tasks. Either you're smashing it or I'm worried about you.",
    "The pipeline is empty. Drako does not approve.",
    "Nothing in the calendar. Block some time — the deals won't chase themselves.",
  ],
  loading: [
    "Fetching your data... I'm fast, not magic.",
    "Hold on, digging through the dungeon...",
    "One sec. Even dragons need a moment.",
    "Loading... good things take a second.",
  ],
  guide: [
    "G'day! I'm Drako. I live in here. Let me show you around the dungeon.",
    "This is your command centre. Everything that needs you is right here.",
    "Your contacts. These are your people — treat 'em right.",
    "Your deals, in order. Move 'em forward or Drako gets antsy.",
  ],
  urgent: [
    "Oi. That task is overdue. Sort it out.",
    "This one's been waiting. Don't leave it hanging.",
    "This deal hasn't moved in a while. Poke it or drop it.",
  ],
};

export function pickDrakoLine(category: DrakoDialogueCategory, seed?: number): string {
  const pool = LINES[category];
  if (!pool.length) return "";
  const i = seed !== undefined ? seed % pool.length : Math.floor(Math.random() * pool.length);
  return pool[i] ?? pool[0];
}

/** Map dialogue categories to default moods from the character brief. */
export const CATEGORY_MOOD: Record<DrakoDialogueCategory, DrakoMood> = {
  celebrate: "celebrate",
  empty: "sleeping",
  loading: "thinking",
  guide: "pointing",
  urgent: "confused",
};
