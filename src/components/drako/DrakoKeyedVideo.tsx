import { memo, useEffect, useRef, useState } from "react";
import type { DrakoVideoKey } from "@/lib/drakoVideoKey";
import { applyDrakoVideoKey } from "@/lib/drakoVideoKey";
import { cn } from "@/lib/utils";

interface DrakoKeyedVideoProps {
  src: string;
  width: number;
  height: number;
  keyConfig: DrakoVideoKey;
  className?: string;
  alt?: string;
  decorative?: boolean;
}

const RENDER_SCALE = 2;
const DEFAULT_LOOP_MARGIN_S = 0.07;

/** Live-action loop with runtime chroma key (OpenArt mattes are not true alpha). */
export const DrakoKeyedVideo = memo(function DrakoKeyedVideo({
  src,
  width,
  height,
  keyConfig,
  className,
  alt,
  decorative,
}: DrakoKeyedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };
  const everPaintedRef = useRef(false);
  const [ready, setReady] = useState(false);

  const [kr, kg, kb] = keyConfig.key;
  const { similarity, blend, green, loopMarginS } = keyConfig;
  const loopMargin = loopMarginS ?? DEFAULT_LOOP_MARGIN_S;
  const renderW = width * RENDER_SCALE;
  const renderH = height * RENDER_SCALE;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.src !== src && typeof window !== "undefined") {
      const absolute = new URL(src, window.location.origin).href;
      if (video.src !== absolute) {
        video.src = src;
        video.load();
      }
    }
    void video.play().catch(() => {});
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true, alpha: true });
    if (!ctx) return;

    const config = { key: [kr, kg, kb] as [number, number, number], similarity, blend, green };
    let raf = 0;
    let stopped = false;

    const paint = () => {
      if (stopped) return;
      const { width: w, height: h } = sizeRef.current;
      const rw = w * RENDER_SCALE;
      const rh = h * RENDER_SCALE;

      // Keep the last keyed frame on canvas until the next clip is ready — no clear/blink.
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.seeking) {
        const dur = video.duration;
        const t = video.currentTime;
        const inLoopSeam =
          Number.isFinite(dur) && dur > loopMargin * 2
            ? t < loopMargin || t > dur - loopMargin
            : false;

        if (!inLoopSeam) {
          ctx.drawImage(video, 0, 0, rw, rh);
          const frame = ctx.getImageData(0, 0, rw, rh);
          applyDrakoVideoKey(frame.data, rw, rh, config);
          ctx.putImageData(frame, 0, 0);
          if (!everPaintedRef.current) {
            everPaintedRef.current = true;
            setReady(true);
          }
        }
      }

      raf = requestAnimationFrame(paint);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };

    video.addEventListener("loadeddata", start);
    video.addEventListener("playing", start);
    void video.play().catch(() => {});

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      video.removeEventListener("loadeddata", start);
      video.removeEventListener("playing", start);
    };
  }, [src, kr, kg, kb, similarity, blend, green]);

  return (
    <span
      className={cn("drako-sprite drako-sprite-video inline-block leading-none", className)}
      style={{ width, height, background: "transparent" }}
    >
      <video
        ref={videoRef}
        src={src}
        loop
        muted
        playsInline
        preload="auto"
        className="hidden"
        aria-hidden
      />
      <canvas
        ref={canvasRef}
        width={renderW}
        height={renderH}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative ? true : undefined}
        className={cn("drako-video-img block h-full w-full", ready ? "opacity-100" : "opacity-0")}
      />
    </span>
  );
});
