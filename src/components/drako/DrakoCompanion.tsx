/**
 * DrakoCompanion — the floating, walking, animated mascot.
 * Renders as a fixed-position overlay at the app root.
 * Controlled entirely through DrakoContext (useDrako / useDrakoInternal).
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { useDrakoInternal } from "./DrakoContext";
import { COMPANION_PX, DRAKO_ALT } from "./types";
import { DrakoSpriteImage } from "./DrakoSpriteImage";
import { getDrakoVideoAsset, getDrakoVideoSrcKey } from "./drakoVideos";

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
  const { state, arrive } = useDrakoInternal();
  const prefersReduced = useReducedMotion();
  const isWalkingRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout>>();

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

  const displayMood = state.isWalking ? state.pendingMood : state.mood;
  const videoSrcKey = getDrakoVideoSrcKey(displayMood);
  const usesVideo = Boolean(getDrakoVideoAsset(displayMood));
  const idleBob = !prefersReduced && !state.isWalking && !usesVideo;
  const walkWaddle = !prefersReduced && state.isWalking;

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
      <motion.div
        animate={{ x: state.position.x, y: state.position.y }}
        transition={
          prefersReduced
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
              style={{ position: "relative", width: COMPANION_PX }}
            >
              <AnimatePresence>
                {state.caption && <DrakoBubble key={state.caption} text={state.caption} />}
              </AnimatePresence>

              <div
                style={{
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
                    key={videoSrcKey}
                    mood={displayMood}
                    width={COMPANION_PX}
                    alt={DRAKO_ALT[displayMood]}
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
