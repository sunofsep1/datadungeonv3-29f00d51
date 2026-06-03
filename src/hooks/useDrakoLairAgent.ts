import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { LairBehavior } from "@/components/drako/drakoVideos";
import type { DrakoMood } from "@/components/drako/types";
import { LEVEL_UP_EVENT } from "@/lib/drakoLairMood";
import {
  clampLairPosition,
  lerp,
  randomWaypoint,
  type LairBounds,
} from "@/lib/drakoLairAgent";
import { periodicBanterLine } from "@/lib/drakoLairGuide";
import { nextCycleMood, pickTapLine } from "@/lib/drakoInteractive";

export interface DrakoLairAgentState {
  mood: DrakoMood;
  behavior: LairBehavior;
  bubble: string | null;
  isFlying: boolean;
  scale: number;
}

interface UseDrakoLairAgentOptions {
  bounds: LairBounds | null;
  paused: boolean;
  /** Sprite wrapper — position updates write here (no per-frame React state). */
  spriteElRef?: RefObject<HTMLElement | null>;
  externalBubble?: string | null;
  externalMood?: DrakoMood | null;
}

const WANDER_MS = 4200;
const BANTER_MS = 150_000;
const IDLE_MOOD: DrakoMood = "play";

function applySpritePosition(el: HTMLElement | null, x: number, y: number): void {
  if (!el) return;
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
}

export function useDrakoLairAgent({
  bounds,
  paused,
  spriteElRef,
  externalBubble = null,
  externalMood = null,
}: UseDrakoLairAgentOptions) {
  const [state, setState] = useState<DrakoLairAgentState>({
    mood: IDLE_MOOD,
    behavior: "wander",
    bubble: null,
    isFlying: false,
    scale: 1,
  });

  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const behaviorRef = useRef<LairBehavior>("wander");
  const initializedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const wanderTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const banterTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pausedRef = useRef(paused);
  const manualMoodRef = useRef(false);
  const spriteElRefStable = useRef(spriteElRef);
  spriteElRefStable.current = spriteElRef;

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      targetRef.current = null;
    }
  }, [paused]);

  const pickWanderTarget = useCallback(() => {
    if (!bounds || pausedRef.current) return;
    targetRef.current = randomWaypoint(bounds);
  }, [bounds]);

  useEffect(() => {
    if (!bounds) return;

    if (!initializedRef.current) {
      const start = clampLairPosition(
        bounds.width * 0.5 - bounds.spriteW / 2,
        bounds.height * 0.65 - bounds.spriteH,
        bounds,
      );
      posRef.current = start;
      applySpritePosition(spriteElRefStable.current?.current ?? null, start.x, start.y);
      initializedRef.current = true;
      return;
    }

    const clamped = clampLairPosition(posRef.current.x, posRef.current.y, bounds);
    posRef.current = clamped;
    applySpritePosition(spriteElRefStable.current?.current ?? null, clamped.x, clamped.y);
  }, [bounds]);

  useEffect(() => {
    if (!bounds || paused) return;

    const tick = () => {
      const target = targetRef.current;
      if (target && behaviorRef.current === "wander") {
        const cur = posRef.current;
        const nextX = lerp(cur.x, target.x, 0.04);
        const nextY = lerp(cur.y, target.y, 0.04);
        const clamped = clampLairPosition(nextX, nextY, bounds);
        posRef.current = clamped;
        applySpritePosition(spriteElRefStable.current?.current ?? null, clamped.x, clamped.y);
        if (Math.hypot(clamped.x - target.x, clamped.y - target.y) < 6) {
          targetRef.current = null;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [bounds, paused]);

  useEffect(() => {
    if (!bounds || paused) return;

    const scheduleWander = () => {
      wanderTimerRef.current = setTimeout(() => {
        if (behaviorRef.current === "wander") pickWanderTarget();
        scheduleWander();
      }, WANDER_MS);
    };

    const scheduleBanter = () => {
      banterTimerRef.current = setTimeout(() => {
        if (behaviorRef.current === "wander" && !manualMoodRef.current) {
          setState((s) => ({ ...s, bubble: periodicBanterLine() }));
        }
        scheduleBanter();
      }, BANTER_MS);
    };

    scheduleWander();
    scheduleBanter();

    return () => {
      clearTimeout(wanderTimerRef.current);
      clearTimeout(banterTimerRef.current);
    };
  }, [bounds, paused, pickWanderTarget]);

  useEffect(() => {
    const onLevelUp = () => {
      behaviorRef.current = "talk";
      setState((s) => ({
        ...s,
        mood: "levelup",
        bubble: "LEVEL UP! The lair is glowing!",
        isFlying: false,
        scale: 1,
      }));
    };
    window.addEventListener(LEVEL_UP_EVENT, onLevelUp);
    return () => window.removeEventListener(LEVEL_UP_EVENT, onLevelUp);
  }, []);

  useEffect(() => {
    if (externalBubble != null && !manualMoodRef.current) {
      setState((s) => ({
        ...s,
        bubble: externalBubble,
        mood: externalMood ?? s.mood,
      }));
    }
  }, [externalBubble, externalMood]);

  const onVideoEnded = useCallback(() => {
    if (state.mood === "levelup" && !manualMoodRef.current) {
      behaviorRef.current = "wander";
      setState((s) => ({
        ...s,
        mood: IDLE_MOOD,
        behavior: "wander",
        isFlying: false,
        scale: 1,
      }));
    }
  }, [state.mood]);

  const getPosition = useCallback(() => posRef.current, []);

  const setPosition = useCallback(
    (x: number, y: number) => {
      if (!bounds) return;
      const clamped = clampLairPosition(x, y, bounds);
      posRef.current = clamped;
      targetRef.current = null;
      behaviorRef.current = "wander";
      applySpritePosition(spriteElRefStable.current?.current ?? null, clamped.x, clamped.y);
      setState((s) => ({
        ...s,
        behavior: "wander",
        isFlying: false,
        scale: 1,
      }));
    },
    [bounds],
  );

  const cycleTapMood = useCallback(() => {
    manualMoodRef.current = true;
    targetRef.current = null;
    behaviorRef.current = "talk";
    setState((s) => {
      const next = nextCycleMood(s.mood);
      return {
        ...s,
        mood: next,
        bubble: pickTapLine(next),
        behavior: "talk",
        isFlying: false,
        scale: 1,
      };
    });
  }, []);

  const displayMood = externalMood ?? state.mood;
  const displayBubble = externalBubble ?? state.bubble;

  return {
    ...state,
    mood: displayMood,
    bubble: displayBubble,
    onVideoEnded,
    getPosition,
    setPosition,
    cycleTapMood,
  };
}
