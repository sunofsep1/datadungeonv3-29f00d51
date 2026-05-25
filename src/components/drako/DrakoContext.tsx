import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type {
  DrakoAnchor,
  DrakoCompanionState,
  DrakoContextValue,
  DrakoMood,
} from "./types";
import { COMPANION_PX } from "./types";

export function getAnchorPosition(anchor: DrakoAnchor): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const S = COMPANION_PX;
  switch (anchor) {
    case "sidebar":      return { x: 20, y: Math.round(vh * 0.5 - S / 2) };
    case "header":       return { x: Math.round(vw * 0.5 - S / 2), y: 12 };
    case "center":       return { x: Math.round(vw * 0.5 - S / 2), y: Math.round(vh * 0.5 - S / 2) };
    case "table":        return { x: Math.round(vw * 0.65), y: Math.round(vh * 0.38) };
    case "empty-state":  return { x: Math.round(vw * 0.5 - S / 2), y: Math.round(vh * 0.65) };
    case "bottom-right": return { x: vw - S - 20, y: vh - S - 20 };
  }
}

const IDLE_TIMEOUT_MS = 60_000;

const initialState: DrakoCompanionState = {
  mood: "idle",
  pendingMood: "idle",
  anchor: "bottom-right",
  position:
    typeof window !== "undefined"
      ? getAnchorPosition("bottom-right")
      : { x: 0, y: 0 },
  isWalking: false,
  isVisible: false,
  caption: null,
};

type Action =
  | { type: "MOVE_TO"; anchor: DrakoAnchor; position: { x: number; y: number }; pendingMood: DrakoMood; caption: string | null }
  | { type: "ARRIVED" }
  | { type: "SET_MOOD"; mood: DrakoMood; caption: string | null }
  | { type: "SHOW" }
  | { type: "HIDE" }
  | { type: "SLEEP" }
  | { type: "WAKE" };

function reducer(state: DrakoCompanionState, action: Action): DrakoCompanionState {
  switch (action.type) {
    case "MOVE_TO":
      return {
        ...state,
        anchor: action.anchor,
        position: action.position,
        pendingMood: action.pendingMood,
        caption: action.caption,
        isWalking: true,
      };
    case "ARRIVED":
      return { ...state, mood: state.pendingMood, isWalking: false };
    case "SET_MOOD":
      return { ...state, mood: action.mood, pendingMood: action.mood, caption: action.caption };
    case "SHOW":
      return { ...state, isVisible: true };
    case "HIDE":
      return { ...state, isVisible: false };
    case "SLEEP":
      return { ...state, mood: "sleeping", pendingMood: "sleeping", isWalking: false };
    case "WAKE":
      return { ...state, mood: "wave", pendingMood: "idle" };
    default:
      return state;
  }
}

const DrakoContext = createContext<DrakoContextValue | null>(null);

export function DrakoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Refs so idle callbacks always see current values without re-subscribing
  const dispatchRef = useRef(dispatch);
  const stateRef = useRef(state);
  dispatchRef.current = dispatch;
  stateRef.current = state;

  // 60-second idle easter egg: sleeping → wave → idle on next interaction
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const handleActivity = () => {
      if (stateRef.current.mood === "sleeping" && stateRef.current.isVisible) {
        dispatchRef.current({ type: "WAKE" });
        setTimeout(
          () => dispatchRef.current({ type: "SET_MOOD", mood: "idle", caption: null }),
          1500,
        );
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (stateRef.current.isVisible) {
          dispatchRef.current({ type: "SLEEP" });
        }
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    handleActivity(); // start the clock

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      clearTimeout(timer);
    };
  }, []);

  const moveTo = useCallback(
    (anchor: DrakoAnchor, opts?: { mood?: DrakoMood; caption?: string }) => {
      const position = getAnchorPosition(anchor);
      const pendingMood = opts?.mood ?? stateRef.current.mood;
      dispatch({ type: "MOVE_TO", anchor, position, pendingMood, caption: opts?.caption ?? null });
    },
    [],
  );

  const setMood = useCallback((mood: DrakoMood, opts?: { caption?: string }) => {
    dispatch({ type: "SET_MOOD", mood, caption: opts?.caption ?? null });
  }, []);

  const arrive  = useCallback(() => dispatch({ type: "ARRIVED" }), []);
  const show    = useCallback(() => dispatch({ type: "SHOW" }), []);
  const hide    = useCallback(() => dispatch({ type: "HIDE" }), []);

  const value = useMemo<DrakoContextValue>(
    () => ({ state, moveTo, setMood, arrive, show, hide }),
    [state, moveTo, setMood, arrive, show, hide],
  );

  return <DrakoContext.Provider value={value}>{children}</DrakoContext.Provider>;
}

/** Internal hook — exposes everything including arrive(). Used by DrakoCompanion only. */
export function useDrakoInternal(): DrakoContextValue {
  const ctx = useContext(DrakoContext);
  if (!ctx) throw new Error("Drako hooks must be used inside <DrakoProvider>");
  return ctx;
}

/** Public hook for CRM components: moveTo, setMood, show, hide + read-only state. */
export function useDrako() {
  const { state, moveTo, setMood, show, hide } = useDrakoInternal();
  return {
    moveTo,
    setMood,
    show,
    hide,
    mood: state.mood,
    anchor: state.anchor,
    isWalking: state.isWalking,
    isVisible: state.isVisible,
  };
}
