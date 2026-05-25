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
  const [visible, setVisible] = useState(false);

  const [kr, kg, kb] = keyConfig.key;
  const { similarity, blend, green } = keyConfig;
  const renderW = width * RENDER_SCALE;
  const renderH = height * RENDER_SCALE;

  useEffect(() => {
    setVisible(false);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const config = { key: [kr, kg, kb] as [number, number, number], similarity, blend, green };
    let raf = 0;
    let stopped = false;
    let painted = false;

    const paint = () => {
      if (stopped) return;
      const { width: w, height: h } = sizeRef.current;
      const rw = w * RENDER_SCALE;
      const rh = h * RENDER_SCALE;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        ctx.drawImage(video, 0, 0, rw, rh);
        const frame = ctx.getImageData(0, 0, rw, rh);
        applyDrakoVideoKey(frame.data, config);
        ctx.putImageData(frame, 0, 0);
        if (!painted) {
          painted = true;
          setVisible(true);
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
    <span className={cn("drako-sprite drako-sprite-video inline-block leading-none", className)} style={{ width, height }}>
      <video ref={videoRef} src={src} loop muted playsInline preload="auto" className="hidden" aria-hidden />
      <canvas
        ref={canvasRef}
        width={renderW}
        height={renderH}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative ? true : undefined}
        className={cn(
          "drako-video-img block h-full w-full transition-opacity duration-150",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
    </span>
  );
});
