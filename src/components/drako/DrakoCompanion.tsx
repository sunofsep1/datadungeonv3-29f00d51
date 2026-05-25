/**
 * DrakoCompanion — the floating, walking, animated mascot.
 * Renders as a fixed-position overlay at the app root.
 * Controlled entirely through DrakoContext (useDrako / useDrakoInternal).
 *
 * Walk frames: currently uses idle↔working as a 2-frame stand-in.
 * Drop drako-walk-1.webp + drako-walk-2.webp in public/drako/ and update
 * WALK_FRAMES in types.ts to use them.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDrakoInternal } from "./DrakoContext";
import { COMPANION_PX, DRAKO_ALT, WALK_FRAMES } from "./types";
import type { DrakoMood } from "./types";

const POS_SPRING = { type: "spring", stiffness: 80, damping: 18 } as const;
const POP_SPRING = { type: "spring", stiffness: 300, damping: 22 } as const;

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
        background: "white",
        color: "#1a1a1a",
        borderRadius: 12,
        padding: "7px 13px",
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: "nowrap",
        maxWidth: 200,
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
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
          borderTop: "6px solid white",
        }}
      />
    </motion.div>
  );
}

export function DrakoCompanion() {
  const { state, arrive } = useDrakoInternal();
  const prefersReduced = useReducedMotion();

  const [walkFrame, setWalkFrame] = useState<0 | 1>(0);
  const isWalkingRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout>>();

  // Keep ref current so callbacks avoid stale closures
  useEffect(() => {
    isWalkingRef.current = state.isWalking;
  }, [state.isWalking]);

  // 2-frame walk cycle: alternate at ~5fps while walking
  useEffect(() => {
    if (!state.isWalking || prefersReduced) {
      setWalkFrame(0);
      return;
    }
    const id = setInterval(() => setWalkFrame((f) => (f === 0 ? 1 : 0)), 200);
    return () => clearInterval(id);
  }, [state.isWalking, prefersReduced]);

  // Fallback: if spring onAnimationComplete doesn't fire, force arrival after 1.8s
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

  const displayMood: DrakoMood = state.isWalking
    ? (WALK_FRAMES[walkFrame] as DrakoMood)
    : state.mood;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "visible",
      }}
    >
      {/* ── Position layer: spring-animated x/y ── */}
      <motion.div
        animate={{ x: state.position.x, y: state.position.y }}
        transition={prefersReduced ? { duration: 0 } : POS_SPRING}
        onAnimationComplete={handleArrival}
      >
        {/* ── Mount / unmount: slide-pop in from below, shrink out ── */}
        <AnimatePresence>
          {state.isVisible && (
            <motion.div
              key="drako-companion"
              initial={prefersReduced ? false : { scale: 0.3, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.3, opacity: 0, y: 20 }}
              transition={prefersReduced ? { duration: 0 } : POP_SPRING}
              style={{ position: "relative", width: COMPANION_PX }}
            >
              {/* Caption speech bubble */}
              <AnimatePresence>
                {state.caption && <DrakoBubble key={state.caption} text={state.caption} />}
              </AnimatePresence>

              {/* ── Bob (idle) or waddle (walking) ── */}
              <div
                style={{
                  animation:
                    prefersReduced
                      ? "none"
                      : state.isWalking
                        ? "drako-waddle 0.35s ease-in-out infinite"
                        : "drako-bob 3s ease-in-out infinite",
                  willChange: "transform",
                }}
              >
                {/* ── Breathing (idle only) ── */}
                <div
                  style={{
                    animation:
                      prefersReduced || state.isWalking
                        ? "none"
                        : "drako-breathe 4s ease-in-out infinite",
                  }}
                >
                  {/* ── Mood crossfade ── */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={displayMood}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.06 }}
                      transition={{ duration: prefersReduced ? 0 : 0.18 }}
                    >
                      <picture>
                        <source
                          type="image/webp"
                          srcSet={`/drako/drako-${displayMood}.webp`}
                        />
                        <img
                          src={`/drako/drako-${displayMood}.png`}
                          srcSet={`/drako/drako-${displayMood}@2x.png 2x`}
                          alt={DRAKO_ALT[displayMood]}
                          width={COMPANION_PX}
                          draggable={false}
                          style={{ imageRendering: "pixelated", display: "block" }}
                        />
                      </picture>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
