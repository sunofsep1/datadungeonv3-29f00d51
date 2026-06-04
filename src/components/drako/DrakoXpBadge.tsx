/**
 * DrakoXpBadge
 * Renders a compact "Lv.N" pill + XP progress bar just below DrakoCompanion.
 *
 * - Subscribes to the drako:xp-updated event so it always shows live state.
 * - Absolutely positioned relative to the companion container
 *   so it rides with Drako wherever he's dragged.
 * - Fades in once Drako is visible.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { readProgress, xpInCurrentLevel, xpSpanOfLevel, MAX_LEVEL } from "@/lib/drakoProgress";
import { COMPANION_PX } from "./types";

const XP_EVENT = "drako:xp-updated";

/** Width of the badge — matches the companion width for a clean underline feel. */
const BADGE_W = COMPANION_PX;

export function DrakoXpBadge({ visible }: { visible: boolean }) {
  const [progress, setProgress] = useState(() => readProgress());

  useEffect(() => {
    const onUpdate = () => setProgress(readProgress());
    window.addEventListener(XP_EVENT, onUpdate);
    return () => window.removeEventListener(XP_EVENT, onUpdate);
  }, []);

  const { level, totalXp } = progress;
  const inLevel = xpInCurrentLevel(totalXp, level);
  const span = xpSpanOfLevel(level);
  const pct = span > 0 ? Math.min(1, inLevel / span) : 1;
  const isCapped = level >= MAX_LEVEL;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 6,
            width: BADGE_W,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {/* Level pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                background: "hsl(var(--primary) / 0.18)",
                color: "hsl(var(--primary))",
                border: "1px solid hsl(var(--primary) / 0.35)",
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.04em",
                lineHeight: 1.4,
                fontFamily: "inherit",
              }}
            >
              LV.{level}
            </span>
            {!isCapped && (
              <span
                style={{
                  color: "hsl(var(--muted-foreground))",
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
              >
                {inLevel} / {span} XP
              </span>
            )}
            {isCapped && (
              <span
                style={{
                  color: "hsl(var(--primary))",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                MAX
              </span>
            )}
          </div>

          {/* XP progress bar */}
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: "hsl(var(--border))",
              overflow: "hidden",
            }}
          >
            <motion.div
              animate={{ width: `${pct * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              style={{
                height: "100%",
                borderRadius: 999,
                background: isCapped
                  ? "hsl(var(--primary))"
                  : "linear-gradient(90deg, hsl(var(--primary) / 0.7), hsl(var(--primary)))",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
