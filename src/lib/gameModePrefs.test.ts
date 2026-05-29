import { describe, expect, it, beforeEach } from "vitest";
import {
  readDrakoAudioEnabled,
  readGameModeEnabled,
  writeDrakoAudioEnabled,
  writeGameModeEnabled,
  GAME_MODE_STORAGE_KEY,
  DRAKO_AUDIO_STORAGE_KEY,
} from "@/lib/gameModePrefs";

describe("gameModePrefs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults game mode to enabled", () => {
    expect(readGameModeEnabled()).toBe(true);
  });

  it("defaults drako audio to enabled", () => {
    expect(readDrakoAudioEnabled()).toBe(true);
  });

  it("persists game mode preference", () => {
    writeGameModeEnabled(false);
    expect(localStorage.getItem(GAME_MODE_STORAGE_KEY)).toBe("false");
    expect(readGameModeEnabled()).toBe(false);
  });

  it("persists drako audio preference", () => {
    writeDrakoAudioEnabled(true);
    expect(localStorage.getItem(DRAKO_AUDIO_STORAGE_KEY)).toBe("true");
    expect(readDrakoAudioEnabled()).toBe(true);
  });
});
