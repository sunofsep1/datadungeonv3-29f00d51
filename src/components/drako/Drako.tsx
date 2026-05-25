/**
 * Drako — static display component (Phase 3).
 * Use this for inline mascot appearances: empty states, toasts, onboarding.
 * For the floating animated companion, use <DrakoCompanion>.
 */
import { useReducedMotion } from "framer-motion";
import type { DrakoMood, DrakoSize } from "./types";
import { DRAKO_ALT, DRAKO_SIZE_PX } from "./types";

interface DrakoProps {
  /** Which pose to render. */
  state?: DrakoMood;
  /** Display size — maps to 48/96/192/384px width. */
  size?: DrakoSize;
  /** Gentle up-and-down bob (default true). Disabled if prefers-reduced-motion. */
  bobbing?: boolean;
  /** Speech bubble text rendered below Drako. */
  caption?: string;
  /** Pass true when the image is purely decorative to hide from screen readers. */
  "aria-hidden"?: boolean;
}

export function Drako({
  state = "idle",
  size = "md",
  bobbing = true,
  caption,
  "aria-hidden": ariaHidden,
}: DrakoProps) {
  const reducedMotion = useReducedMotion();
  const px = DRAKO_SIZE_PX[size];
  const shouldBob = bobbing && !reducedMotion;

  return (
    <div
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}
      aria-hidden={ariaHidden ?? undefined}
    >
      <div
        style={{
          animation: shouldBob ? "drako-bob 3s ease-in-out infinite" : "none",
          willChange: shouldBob ? "transform" : undefined,
        }}
      >
        <div
          style={{
            animation: shouldBob ? "drako-breathe 4s ease-in-out infinite" : "none",
          }}
        >
          <picture>
            <source type="image/webp" srcSet={`/drako/drako-${state}.webp`} />
            <img
              src={`/drako/drako-${state}.png`}
              srcSet={`/drako/drako-${state}@2x.png 2x`}
              alt={ariaHidden ? "" : DRAKO_ALT[state]}
              width={px}
              style={{ imageRendering: "pixelated", display: "block" }}
              draggable={false}
            />
          </picture>
        </div>
      </div>

      {caption && (
        <div
          style={{
            background: "white",
            color: "#1a1a1a",
            borderRadius: 12,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 500,
            maxWidth: Math.max(px * 1.5, 140),
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            position: "relative",
          }}
        >
          {caption}
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderBottom: "5px solid white",
            }}
          />
        </div>
      )}
    </div>
  );
}
