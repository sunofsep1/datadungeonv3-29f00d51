/**
 * DrakoCompanion — draggable, clickable floating mascot.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDrakoInternal } from "./DrakoContext";
import { COMPANION_PX, DRAKO_ALT, DRAKO_VIDEO_RENDER_SCALE } from "./types";
import { DrakoSpriteImage } from "./DrakoSpriteImage";
import type { DrakoKeyedVideoHandle } from "./DrakoKeyedVideo";
import { getDrakoVideoAsset } from "./drakoVideos";
import { clampDrakoPosition, DRAG_THRESHOLD_PX } from "@/lib/drakoInteractive";
import { DrakoXpBadge } from "./DrakoXpBadge";
import { useGameMode } from "@/hooks/useGameMode";

const POS_SPRING = { type: "spring", stiffness: 80, damping: 18 } as const;
const POP_SPRING = { type: "spring", stiffness: 300, damping: 22 } as const;
const GLIDE_SPRING = { type: "spring", stiffness: 120, damping: 22 } as const;

function DrakoBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 6 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "hsl(var(--card))",
        color: "hsl(var(--foreground))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 12,
        padding: "7px 13px",
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: "nowrap",
        maxWidth: 220,
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45), 0 0 16px hsl(var(--primary) / 0.15)",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {text}
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid hsl(var(--card))",
        }}
      />
    </motion.div>
  );
}

export function DrakoCompanion() {
  const { state, presence, arrive, placeAt, cycleVideoMood } = useDrakoInternal();
  const { gameModeEnabled, drakoAudioEnabled } = useGameMode();
  const prefersReduced = useReducedMotion();
  const drakoVideoRef = useRef<DrakoKeyedVideoHandle>(null);
  const audioUnlockedRef = useRef(false);
  const isWalkingRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout>>();
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    originX: 0,
    originY: 0,
    startClientX: 0,
    startClientY: 0,
  });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    isWalkingRef.current = state.isWalking;
  }, [state.isWalking]);

  useEffect(() => {
    if (!state.isWalking) return;
    fallbackRef.current = setTimeout(() => {
      if (isWalkingRef.current) arrive();
    }, 1800);
    return () => clearTimeout(fallbackRef.current);
  }, [state.isWalking, arrive]);

  const handleArrival = useCallback(() => {
    clearTimeout(fallbackRef.current);
    if (isWalkingRef.current) arrive();
  }, [arrive]);

  const finishDrag = useCallback(() => {
    dragRef.current.active = false;
    dragPosRef.current = null;
    setDragPos(null);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;

      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      if (!d.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        d.moved = true;
      }
      if (d.moved) {
        const next = clampDrakoPosition(d.originX + dx, d.originY + dy);
        dragPosRef.current = next;
        setDragPos(next);
      }
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;

      if (d.moved && dragPosRef.current) {
        placeAt(dragPosRef.current);
      } else if (!d.moved) {
        cycleVideoMood();
        if (drakoAudioEnabled) {
          audioUnlockedRef.current = true;
          drakoVideoRef.current?.restartAudio();
          window.setTimeout(() => drakoVideoRef.current?.restartAudio(), 0);
        }
      }

      finishDrag();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [cycleVideoMood, finishDrag, placeAt, drakoAudioEnabled]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || state.isWalking) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        active: true,
        moved: false,
        pointerId: e.pointerId,
        originX: state.position.x,
        originY: state.position.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
      };
    },
    [state.isWalking, state.position.x, state.position.y],
  );

  const displayMood = state.isWalking ? state.pendingMood : state.mood;
  const usesVideo = Boolean(getDrakoVideoAsset(displayMood));
  const idleBob = !prefersReduced && !state.isWalking && !usesVideo && !dragPos;
  const walkWaddle = !prefersReduced && state.isWalking;
  const isDragging = dragPos !== null;
  const posX = dragPos?.x ?? state.position.x;
  const posY = dragPos?.y ?? state.position.y;

  useEffect(() => {
    if (!drakoAudioEnabled || !audioUnlockedRef.current) return;
    drakoVideoRef.current?.restartAudio();
  }, [displayMood, drakoAudioEnabled]);

  // One Drako at a time — Lair Den owns him on /lair
  if (!gameModeEnabled || presence === "lair" || presence === "hidden") return null;

  return (
    <div
      data-drako-root
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "visible",
      }}
    >
      <motion.div
        animate={{ x: posX, y: posY }}
        transition={
          prefersReduced || isDragging
            ? { duration: 0 }
            : state.isWalking
              ? POS_SPRING
              : GLIDE_SPRING
        }
        onAnimationComplete={handleArrival}
      >
        <AnimatePresence>
          {state.isVisible && (
            <motion.div
              key="drako-companion"
              initial={prefersReduced ? false : { scale: 0.3, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.3, opacity: 0, y: 20 }}
              transition={prefersReduced ? { duration: 0 } : POP_SPRING}
              style={{ position: "relative", width: COMPANION_PX, pointerEvents: "auto" }}
            >
              <AnimatePresence>
                {state.caption && <DrakoBubble key={state.caption} text={state.caption} />}
              </AnimatePresence>
              <DrakoXpBadge visible={state.isVisible} />

              <div
                role="button"
                tabIndex={0}
                aria-label="Drako — drag to move, click to change animation"
                onPointerDown={onPointerDown}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    cycleVideoMood();
                    if (drakoAudioEnabled) {
                      audioUnlockedRef.current = true;
                      drakoVideoRef.current?.restartAudio();
                    }
                  }
                }}
                className="drako-companion-sprite-inner"
                style={{
                  touchAction: "none",
                  userSelect: "none",
                  animation: walkWaddle
                    ? "drako-waddle 0.35s ease-in-out infinite"
                    : idleBob
                      ? "drako-bob 3s ease-in-out infinite"
                      : "none",
                  willChange: walkWaddle || idleBob ? "transform" : undefined,
                }}
              >
                <div
                  style={{
                    animation: idleBob ? "drako-breathe 4s ease-in-out infinite" : "none",
                  }}
                >
                  <DrakoSpriteImage
                    ref={drakoVideoRef}
                    mood={displayMood}
                    width={COMPANION_PX}
                    className="drako-companion-video"
                    alt={DRAKO_ALT[displayMood]}
                    muted={!drakoAudioEnabled}
                    renderScale={DRAKO_VIDEO_RENDER_SCALE}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
