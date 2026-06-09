/**
 * Persistent triage state for the Daily Hub 5-column kanban.
 * Stores which zone each item has been dragged into, keyed by itemId.
 * Falls back to "schedule" for any item not in the map.
 */

export type HubZone = "schedule" | "focusRoom" | "working" | "holdingBay" | "parked";

export interface HubZoneAssignment {
  zone: HubZone;
  order: number;
}

export interface HubTriageState {
  assignments: Record<string, HubZoneAssignment>;
  v: 1;
}

const EMPTY_STATE: HubTriageState = { assignments: {}, v: 1 };

function triageKey(userId: string): string {
  return `datadungeon_daily_hub_triage_v1:user:${userId}`;
}

export function loadHubTriage(userId: string | undefined): HubTriageState {
  if (!userId) return EMPTY_STATE;
  try {
    const raw = localStorage.getItem(triageKey(userId));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as HubTriageState;
    if (!parsed?.assignments) return EMPTY_STATE;
    return parsed;
  } catch {
    return EMPTY_STATE;
  }
}

export function saveHubTriage(userId: string, state: HubTriageState): void {
  try {
    localStorage.setItem(triageKey(userId), JSON.stringify(state));
  } catch {
    // localStorage can be unavailable in some contexts — fail silently
  }
}

export function assignItem(
  state: HubTriageState,
  itemId: string,
  zone: HubZone,
  existingZoneCount: number,
): HubTriageState {
  const assignments = { ...state.assignments };
  if (zone === "schedule") {
    delete assignments[itemId];
  } else {
    assignments[itemId] = { zone, order: existingZoneCount };
  }
  return { ...state, assignments };
}

export function removeItem(state: HubTriageState, itemId: string): HubTriageState {
  const assignments = { ...state.assignments };
  delete assignments[itemId];
  return { ...state, assignments };
}

export function getItemZone(state: HubTriageState, itemId: string): HubZone {
  return state.assignments[itemId]?.zone ?? "schedule";
}

export function getItemOrder(state: HubTriageState, itemId: string): number {
  return state.assignments[itemId]?.order ?? 9999;
}
