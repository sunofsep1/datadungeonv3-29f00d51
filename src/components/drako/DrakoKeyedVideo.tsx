import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { DrakoVideoKey } from "@/lib/drakoVideoKey";
import { applyDrakoVideoKey } from "@/lib/drakoVideoKey";
import { cn } from "@/lib/utils";

interface DrakoKeyedVideoProps {
  src: string;
  width: number;
  height: number;
  keyConfig: DrakoVideoKey;
  loop?: boolean;
  muted?: boolean;
  renderScale?: number;
  className?: string;
  alt?: string;
  decorative?: boolean;
  onEnded?: () => void;
}

export interface DrakoKeyedVideoHandle {
  /** Unmute and keep playing from the current position. */
  ensureAudio: () => void;
  /** Unmute and restart the clip from the beginning (mood change). */
  restartAudio: () => void;
}

const DEFAULT_RENDER_SCALE = 1;
const DEFAULT_LOOP_MARGIN_S = 0.07;

/** Live-action loop with runtime chroma key — best quality for OpenArt mattes. */
export const DrakoKeyedVideo = memo(
  forwardRef<DrakoKeyedVideoHandle, DrakoKeyedVideoProps>(function DrakoKeyedVideo(
    {
      src,
      width,
      height,
      keyConfig,
      loop = true,
      muted = true,
      renderScale = DEFAULT_RENDER_SCALE,
      className,
      alt,
      decorative,
      onEnded,
    },
    ref,
  ) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };
  const everPaintedRef = useRef(false);
  const [ready, setReady] = useState(false);

  const [kr, kg, kb] = keyConfig.key;
  const { similarity, blend, green, loopMarginS } = keyConfig;
  const loopMargin = loopMarginS ?? DEFAULT_LOOP_MARGIN_S;
  const renderW = width * renderScale;
  const renderH = height * renderScale;
  const scaleRef = useRef(renderScale);
  scaleRef.current = renderScale;

  useImperativeHandle(ref, () => ({
    ensureAudio: () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = false;
      video.volume = 1;
      void video.play().catch(() => {});
    },
    restartAudio: () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = false;
      video.volume = 1;
      try {
        video.currentTime = 0;
      } catch {
        /* ignore seek errors during load */
      }
      void video.play().catch(() => {});
    },
  }));

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
      const rs = scaleRef.current;
      const rw = w * rs;
      const rh = h * rs;

      // Keep the last keyed frame on canvas until the next clip is ready — no clear/blink.
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.seeking) {
        const dur = video.duration;
        const t = video.currentTime;
        const inLoopSeam =
          Number.isFinite(dur) && dur > loopMargin * 2
            ? t < loopMargin || t > dur - loopMargin
            : false;

        if (!inLoopSeam) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw > 0 && vh > 0) {
            const fit = Math.min(rw / vw, rh / vh);
            const dw = vw * fit;
            const dh = vh * fit;
            const dx = (rw - dw) / 2;
            const dy = (rh - dh) / 2;
            ctx.clearRect(0, 0, rw, rh);
            ctx.drawImage(video, dx, dy, dw, dh);
          } else {
            ctx.drawImage(video, 0, 0, rw, rh);
          }
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
  }, [src, kr, kg, kb, similarity, blend, green, renderScale]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.volume = muted ? 0 : 1;
    if (!muted) void video.play().catch(() => {});
  }, [muted, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onEnded) return;
    const handleEnded = () => onEnded();
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [onEnded, src]);

  return (
    <span
      className={cn("drako-sprite drako-sprite-video inline-block leading-none", className)}
      style={{ width, height, background: "transparent" }}
    >
      <video
        ref={videoRef}
        src={src}
        loop={loop}
        muted={muted}
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
  }),
);
