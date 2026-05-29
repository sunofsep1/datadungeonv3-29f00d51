export const GAME_MODE_STORAGE_KEY = "settings.gameModeEnabled";
export const DRAKO_AUDIO_STORAGE_KEY = "settings.drakoAudioEnabled";
export const GAME_MODE_CHANGED_EVENT = "datadungeon:game-mode-changed";

export function readGameModeEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  const raw = localStorage.getItem(GAME_MODE_STORAGE_KEY);
  if (raw === null) return true;
  return raw === "true";
}

export function writeGameModeEnabled(enabled: boolean): void {
  localStorage.setItem(GAME_MODE_STORAGE_KEY, String(enabled));
  window.dispatchEvent(new Event(GAME_MODE_CHANGED_EVENT));
}

export function readDrakoAudioEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  const raw = localStorage.getItem(DRAKO_AUDIO_STORAGE_KEY);
  if (raw === null) return true;
  return raw === "true";
}

export function writeDrakoAudioEnabled(enabled: boolean): void {
  localStorage.setItem(DRAKO_AUDIO_STORAGE_KEY, String(enabled));
  window.dispatchEvent(new Event(GAME_MODE_CHANGED_EVENT));
}
