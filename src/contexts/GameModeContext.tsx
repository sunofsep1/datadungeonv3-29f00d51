import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GAME_MODE_CHANGED_EVENT,
  readDrakoAudioEnabled,
  readGameModeEnabled,
  writeDrakoAudioEnabled,
  writeGameModeEnabled,
} from "@/lib/gameModePrefs";

interface GameModeContextValue {
  gameModeEnabled: boolean;
  drakoAudioEnabled: boolean;
  setGameModeEnabled: (enabled: boolean) => void;
  setDrakoAudioEnabled: (enabled: boolean) => void;
}

const GameModeContext = createContext<GameModeContextValue | undefined>(undefined);

export function GameModeProvider({ children }: { children: ReactNode }) {
  const [gameModeEnabled, setGameModeEnabledState] = useState(() => readGameModeEnabled());
  const [drakoAudioEnabled, setDrakoAudioEnabledState] = useState(() => readDrakoAudioEnabled());

  useEffect(() => {
    const sync = () => {
      setGameModeEnabledState(readGameModeEnabled());
      setDrakoAudioEnabledState(readDrakoAudioEnabled());
    };
    window.addEventListener(GAME_MODE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(GAME_MODE_CHANGED_EVENT, sync);
  }, []);

  const setGameModeEnabled = useCallback((enabled: boolean) => {
    writeGameModeEnabled(enabled);
    setGameModeEnabledState(enabled);
    if (!enabled) {
      writeDrakoAudioEnabled(false);
      setDrakoAudioEnabledState(false);
    }
  }, []);

  const setDrakoAudioEnabled = useCallback((enabled: boolean) => {
    writeDrakoAudioEnabled(enabled);
    setDrakoAudioEnabledState(enabled);
  }, []);

  const value = useMemo(
    () => ({
      gameModeEnabled,
      drakoAudioEnabled,
      setGameModeEnabled,
      setDrakoAudioEnabled,
    }),
    [gameModeEnabled, drakoAudioEnabled, setGameModeEnabled, setDrakoAudioEnabled],
  );

  return <GameModeContext.Provider value={value}>{children}</GameModeContext.Provider>;
}

export function useGameMode(): GameModeContextValue {
  const ctx = useContext(GameModeContext);
  if (!ctx) throw new Error("useGameMode must be used within GameModeProvider");
  return ctx;
}
