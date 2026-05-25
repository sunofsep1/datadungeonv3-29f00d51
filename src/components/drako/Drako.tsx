/**
 * Drako — static display component (Phase 3).
 * Use this for inline mascot appearances: empty states, toasts, onboarding.
 * For the floating animated companion, use <DrakoCompanion>.
 */
import { useReducedMotion } from "framer-motion";
import type { DrakoMood, DrakoSize } from "./types";
import { DRAKO_SIZE_PX } from "./types";
import { DrakoSpriteImage } from "./DrakoSpriteImage";

interface DrakoProps {
  state?: DrakoMood;
  size?: DrakoSize;
  bobbing?: boolean;
  caption?: string;
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
      className="inline-flex flex-col items-center gap-2"
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
          <DrakoSpriteImage mood={state} width={px} decorative={ariaHidden} />
        </div>
      </div>

      {caption && (
        <div className="drako-caption-bubble relative max-w-[min(100%,14rem)] rounded-xl px-3.5 py-1.5 text-center text-xs font-medium shadow-lg">
          {caption}
        </div>
      )}
    </div>
  );
}
