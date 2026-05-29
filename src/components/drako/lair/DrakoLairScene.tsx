import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DrakoSpriteImage } from "@/components/drako/DrakoSpriteImage";
import type { DrakoKeyedVideoHandle } from "@/components/drako/DrakoKeyedVideo";
import { DrakoSpeechBubble } from "@/components/drako/DrakoSpeechBubble";
import { DRAKO_ALT, DRAKO_VIDEO_RENDER_SCALE, type DrakoMood } from "@/components/drako/types";
import { getDrakoVideoAsset } from "@/components/drako/drakoVideos";
import { useGameMode } from "@/hooks/useGameMode";
import { useDrakoLairAgent } from "@/hooks/useDrakoLairAgent";
import type { LairBounds } from "@/lib/drakoLairAgent";
import { clampLairPosition } from "@/lib/drakoLairAgent";
import {
  hasSeenLairTour,
  LAIR_TOUR_STEPS,
  markLairTourSeen,
} from "@/lib/drakoLairGuide";
import { DRAG_THRESHOLD_PX } from "@/lib/drakoInteractive";
import { DrakoLairBackground } from "./DrakoLairBackground";
import { DrakoLairHud } from "./DrakoLairHud";
import { cn } from "@/lib/utils";

/** Lair sprite — match companion pixel grid, slightly larger in scene. */
function useLairSpriteSize() {
  const [size, setSize] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? 168 : 184,
  );

  useEffect(() => {
    const onResize = () => setSize(window.innerWidth < 768 ? 168 : 184);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}

export function DrakoLairScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const spriteW = useLairSpriteSize();
  const spriteH = spriteW;
  const { drakoAudioEnabled } = useGameMode();
  const [bounds, setBounds] = useState<LairBounds | null>(null);
  const [hudPaused, setHudPaused] = useState(false);
  const [tourBubble, setTourBubble] = useState<string | null>(null);
  const [tourMood, setTourMood] = useState<DrakoMood | null>(null);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const [guideOverride, setGuideOverride] = useState<{ line: string; mood: DrakoMood } | null>(
    null,
  );
  const [userPlaced, setUserPlaced] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  const drakoVideoRef = useRef<DrakoKeyedVideoHandle>(null);
  const audioUnlockedRef = useRef(false);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    originX: 0,
    originY: 0,
    startClientX: 0,
    startClientY: 0,
  });

  const measureBounds = useCallback(() => {
    const el = sceneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const isMobile = rect.width < 768;
    setBounds({
      width: rect.width,
      height: rect.height,
      paddingTop: isMobile ? 120 : 96,
      paddingBottom: isMobile ? 88 : 48,
      paddingLeft: isMobile ? 12 : 160,
      paddingRight: isMobile ? 12 : 160,
      spriteW,
      spriteH,
    });
  }, [spriteW, spriteH]);

  useEffect(() => {
    measureBounds();
    const el = sceneRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measureBounds);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureBounds]);

  useEffect(() => {
    if (!hasSeenLairTour()) {
      setTourActive(true);
      setTourIndex(0);
      setTourBubble(LAIR_TOUR_STEPS[0]?.line ?? null);
      setTourMood(LAIR_TOUR_STEPS[0]?.mood ?? "wave");
    }
  }, []);

  useEffect(() => {
    if (!tourActive) return;
    const step = LAIR_TOUR_STEPS[tourIndex];
    if (!step) {
      setTourActive(false);
      setTourBubble(null);
      setTourMood(null);
      markLairTourSeen();
      return;
    }
    setTourBubble(step.line);
    setTourMood(step.mood ?? "wave");
    const id = window.setTimeout(() => setTourIndex((i) => i + 1), 4500);
    return () => window.clearTimeout(id);
  }, [tourActive, tourIndex]);

  const isDragging = dragPos !== null;

  const agent = useDrakoLairAgent({
    bounds,
    paused: hudPaused || tourActive || isDragging || userPlaced,
    externalBubble: tourActive ? tourBubble : userPlaced ? null : (guideOverride?.line ?? null),
    externalMood: tourActive ? tourMood : userPlaced ? null : (guideOverride?.mood ?? null),
  });

  const {
    x: agentX,
    y: agentY,
    mood: agentMood,
    bubble: agentBubble,
    scale: agentScale,
    isFlying,
    onVideoEnded,
    setPosition,
    cycleTapMood,
  } = agent;

  const finishDrag = useCallback(() => {
    dragRef.current.active = false;
    dragPosRef.current = null;
    setDragPos(null);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId || !bounds || !sceneRef.current) return;

      const rect = sceneRef.current.getBoundingClientRect();
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      if (!d.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        d.moved = true;
      }
      if (d.moved) {
        const next = clampLairPosition(d.originX + dx, d.originY + dy, bounds);
        dragPosRef.current = next;
        setDragPos(next);
      }
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;

      if (d.moved && dragPosRef.current) {
        setPosition(dragPosRef.current.x, dragPosRef.current.y);
        setUserPlaced(true);
      } else if (!d.moved) {
        cycleTapMood();
        setUserPlaced(true);
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
  }, [setPosition, cycleTapMood, bounds, finishDrag, drakoAudioEnabled]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || tourActive) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        active: true,
        moved: false,
        pointerId: e.pointerId,
        originX: dragPos?.x ?? agentX,
        originY: dragPos?.y ?? agentY,
        startClientX: e.clientX,
        startClientY: e.clientY,
      };
    },
    [agentX, agentY, dragPos, tourActive],
  );

  const renderScale = DRAKO_VIDEO_RENDER_SCALE;

  const videoAsset = getDrakoVideoAsset(agentMood);
  const posX = dragPos?.x ?? agentX;
  const posY = dragPos?.y ?? agentY;

  useEffect(() => {
    if (!drakoAudioEnabled || !audioUnlockedRef.current) return;
    drakoVideoRef.current?.restartAudio();
  }, [agentMood, drakoAudioEnabled]);

  return (
    <div
      ref={sceneRef}
      className={cn(
        "relative -mx-4 w-[calc(100%+2rem)] overflow-hidden sm:-mx-6 sm:w-[calc(100%+3rem)]",
        "min-h-[calc(100dvh-60px-5rem)] md:min-h-[calc(100dvh-60px-1.5rem)]",
      )}
    >
      <DrakoLairBackground imageClassName="object-[center_55%]" />

      <DrakoLairHud
        onPanelChange={(panel) => setHudPaused(panel !== null)}
        onGuideLine={(line, mood) => {
          if (!tourActive) {
            setGuideOverride({ line, mood: mood ?? "wave" });
            window.setTimeout(() => setGuideOverride(null), 4000);
          }
        }}
      />

      <div className="relative z-10 h-full min-h-[inherit] w-full">
        <div
          className={cn(
            "drako-lair-sprite-wrap absolute",
            !isDragging && !userPlaced && agentScale === 1 && "transition-[left,top] duration-300 ease-out",
          )}
          style={{
            left: posX,
            top: posY,
            width: spriteW,
            height: spriteH,
            transform: `scale(${agentScale})`,
            zIndex: isFlying ? 15 : 10,
            pointerEvents: "auto",
            touchAction: "none",
          }}
        >
          <AnimatePresence>
            {agentBubble ? (
              <DrakoSpeechBubble
                key={agentBubble}
                text={agentBubble}
                className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 drako-speech-bubble-retro"
              />
            ) : null}
          </AnimatePresence>

          <div
            role="button"
            tabIndex={0}
            aria-label="Drako — drag to move, click to change animation"
            onPointerDown={onPointerDown}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                cycleTapMood();
                setUserPlaced(true);
                if (drakoAudioEnabled) {
                  audioUnlockedRef.current = true;
                  drakoVideoRef.current?.restartAudio();
                }
              }
            }}
            className="drako-lair-sprite-inner h-full w-full select-none"
          >
            <DrakoSpriteImage
              ref={drakoVideoRef}
              mood={agentMood}
              width={spriteW}
              className="drako-lair-video"
              alt={DRAKO_ALT[agentMood]}
              muted={!drakoAudioEnabled}
              renderScale={renderScale}
              onVideoEnded={videoAsset?.loop === false ? onVideoEnded : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
