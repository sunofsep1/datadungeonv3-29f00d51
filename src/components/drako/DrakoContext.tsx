import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  DrakoAnchor,
  DrakoCompanionState,
  DrakoContextValue,
  DrakoMood,
  DrakoPresence,
} from "./types";
import { COMPANION_PX } from "./types";
import { clampDrakoPosition, nextCycleMood, pickTapLine } from "@/lib/drakoInteractive";
import { preloadDrakoVideos } from "./drakoVideos";

function parseSidebarWidthPx(): number {
  if (typeof window === "undefined") return 248;
  if (window.innerWidth < 768) return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--dd-sidebar-width").trim();
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 248;
}

export function getAnchorPosition(anchor: DrakoAnchor): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const S = COMPANION_PX;
  const spriteH = Math.round(S * 0.75);
  const isDesktop = vw >= 768;
  const sidebarPx = parseSidebarWidthPx();
  const sidebarLeft = isDesktop ? sidebarPx + 12 : 12;
  const bottomInset = isDesktop ? 32 : 96;

  const headerH = 60;

  switch (anchor) {
    case "sidebar":
      return { x: 20, y: Math.round(vh * 0.5 - S / 2) };
    case "sidebar-dock":
      return { x: sidebarLeft, y: vh - S - bottomInset };
    case "top-right":
      return { x: vw - S - 16, y: headerH + 8 };
    case "stage": {
      const contentLeft = sidebarPx;
      const contentW = vw - contentLeft;
      const centerX = contentLeft + contentW * 0.56 - S / 2;
      const minX = contentLeft + Math.min(48, contentW * 0.08);
      const contentH = vh - headerH;
      return {
        x: Math.round(Math.max(minX, centerX)),
        y: Math.round(headerH + contentH * 0.16 - spriteH / 2),
      };
    }
    case "header":
      return { x: Math.round(vw * 0.5 - S / 2), y: 12 };
    case "center":
      return { x: Math.round(vw * 0.5 - S / 2), y: Math.round(vh * 0.5 - S / 2) };
    case "table":
      return { x: Math.round(vw * 0.65), y: Math.round(vh * 0.38) };
    case "empty-state":
      return { x: Math.round(vw * 0.5 - S / 2), y: Math.round(vh * 0.65) };
    case "bottom-right":
      return { x: vw - S - 20, y: vh - S - bottomInset };
    case "free":
      return { x: 0, y: 0 };
  }
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

const initialState: DrakoCompanionState = {
  mood: "idle",
  pendingMood: "idle",
  anchor: "stage",
  position:
    typeof window !== "undefined"
      ? getAnchorPosition("stage")
      : { x: 0, y: 0 },
  isWalking: false,
  isVisible: false,
  caption: null,
};

type Action =
  | { type: "MOVE_TO"; anchor: DrakoAnchor; position: { x: number; y: number }; pendingMood: DrakoMood; caption: string | null }
  | { type: "GLIDE_TO"; anchor: DrakoAnchor; position: { x: number; y: number }; pendingMood: DrakoMood; caption: string | null }
  | { type: "ARRIVED" }
  | { type: "SET_MOOD"; mood: DrakoMood; caption: string | null }
  | { type: "SHOW" }
  | { type: "HIDE" }
  | { type: "SLEEP" }
  | { type: "WAKE" }
  | { type: "REPOSITION"; position: { x: number; y: number } }
  | { type: "PLACE_AT"; position: { x: number; y: number } };

const POSITION_EPS = 12;
const GLIDE_MAX_PX = 56;

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
    case "GLIDE_TO":
      return {
        ...state,
        anchor: action.anchor,
        position: action.position,
        mood: action.pendingMood,
        pendingMood: action.pendingMood,
        caption: action.caption,
        isWalking: false,
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
    case "REPOSITION":
      return { ...state, position: action.position, isWalking: false };
    case "PLACE_AT":
      return {
        ...state,
        anchor: "free",
        position: action.position,
        isWalking: false,
      };
    default:
      return state;
  }
}

const DrakoContext = createContext<DrakoContextValue | null>(null);

export function DrakoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [presence, setPresence] = useState<DrakoPresence>("companion");

  // Refs so idle callbacks always see current values without re-subscribing
  const dispatchRef = useRef(dispatch);
  const stateRef = useRef(state);
  const idleSleepTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const wakeFadeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const moodBeforeSleepRef = useRef<DrakoMood>("idle");

  useLayoutEffect(() => {
    dispatchRef.current = dispatch;
    stateRef.current = state;
  });

  const clearWakeFade = useCallback(() => {
    clearTimeout(wakeFadeTimerRef.current);
  }, []);

  const resetIdleClock = useCallback(() => {
    clearTimeout(idleSleepTimerRef.current);
    idleSleepTimerRef.current = setTimeout(() => {
      if (stateRef.current.isVisible && stateRef.current.mood !== "sleeping") {
        moodBeforeSleepRef.current = stateRef.current.mood;
        dispatchRef.current({ type: "SLEEP" });
      }
    }, IDLE_TIMEOUT_MS);
  }, []);

  // 5-minute idle → sleep. Mood changes only on Drako click (except wake restore).
  useEffect(() => {
    const handleActivity = (e?: Event) => {
      const target = e?.target;
      const fromDrako = target instanceof HTMLElement && target.closest("[data-drako-root]");

      if (fromDrako) {
        clearWakeFade();
        resetIdleClock();
        return;
      }

      if (stateRef.current.mood === "sleeping" && stateRef.current.isVisible) {
        clearWakeFade();
        dispatchRef.current({
          type: "SET_MOOD",
          mood: moodBeforeSleepRef.current,
          caption: null,
        });
      }
      resetIdleClock();
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetIdleClock();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      clearTimeout(idleSleepTimerRef.current);
      clearWakeFade();
    };
  }, [clearWakeFade, resetIdleClock]);

  useEffect(() => {
    preloadDrakoVideos();
  }, []);

  // Keep position correct on resize and sidebar collapse/expand
  useEffect(() => {
    const reposition = () => {
      if (stateRef.current.anchor === "free") return;
      const anchor = stateRef.current.anchor;
      dispatchRef.current({
        type: "REPOSITION",
        position: getAnchorPosition(anchor),
      });
    };
    window.addEventListener("resize", reposition, { passive: true });
    const observer = new MutationObserver(reposition);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => {
      window.removeEventListener("resize", reposition);
      observer.disconnect();
    };
  }, []);

  const moveTo = useCallback(
    (anchor: DrakoAnchor, opts?: { mood?: DrakoMood; caption?: string }) => {
      const position = getAnchorPosition(anchor);
      const moodChange = opts?.mood !== undefined;
      const pendingMood = opts?.mood ?? stateRef.current.mood;
      const caption = opts?.caption ?? null;
      const cur = stateRef.current;
      const dist = Math.hypot(position.x - cur.position.x, position.y - cur.position.y);

      if (cur.anchor === anchor && dist < POSITION_EPS) {
        if (moodChange && cur.mood !== pendingMood) {
          dispatch({ type: "SET_MOOD", mood: pendingMood, caption });
        } else if (caption !== null && cur.caption !== caption) {
          dispatch({ type: "SET_MOOD", mood: cur.mood, caption });
        }
        return;
      }

      if (dist < GLIDE_MAX_PX) {
        dispatch({ type: "GLIDE_TO", anchor, position, pendingMood: moodChange ? pendingMood : cur.mood, caption });
        return;
      }

      dispatch({
        type: "MOVE_TO",
        anchor,
        position,
        pendingMood: moodChange ? pendingMood : cur.mood,
        caption,
      });
    },
    [],
  );

  const setMood = useCallback((mood: DrakoMood, opts?: { caption?: string }) => {
    dispatch({ type: "SET_MOOD", mood, caption: opts?.caption ?? null });
  }, []);

  const placeAt = useCallback(
    (position: { x: number; y: number }) => {
      clearWakeFade();
      resetIdleClock();
      dispatch({ type: "PLACE_AT", position: clampDrakoPosition(position.x, position.y) });
    },
    [clearWakeFade, resetIdleClock],
  );

  const cycleVideoMood = useCallback(() => {
    clearWakeFade();
    resetIdleClock();
    const next = nextCycleMood(stateRef.current.mood);
    dispatch({ type: "SET_MOOD", mood: next, caption: pickTapLine(next) });
  }, [clearWakeFade, resetIdleClock]);

  const arrive  = useCallback(() => dispatch({ type: "ARRIVED" }), []);
  const show    = useCallback(() => dispatch({ type: "SHOW" }), []);
  const hide    = useCallback(() => dispatch({ type: "HIDE" }), []);

  const value = useMemo<DrakoContextValue>(
    () => ({ state, presence, setPresence, moveTo, setMood, placeAt, cycleVideoMood, arrive, show, hide }),
    [state, presence, moveTo, setMood, placeAt, cycleVideoMood, arrive, show, hide],
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
  const { state, presence, setPresence, moveTo, setMood, show, hide } = useDrakoInternal();
  return {
    moveTo,
    setMood,
    show,
    hide,
    presence,
    setPresence,
    mood: state.mood,
    anchor: state.anchor,
    isWalking: state.isWalking,
    isVisible: state.isVisible,
  };
}
