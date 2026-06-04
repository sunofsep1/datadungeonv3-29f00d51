import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DrakoAlphaVideoProps {
  src: string;
  width: number;
  height: number;
  loop?: boolean;
  className?: string;
  alt?: string;
  decorative?: boolean;
  onEnded?: () => void;
  onError?: () => void;
}

let webmVp9Supported: boolean | null = null;

export function canPlayDrakoWebm(): boolean {
  if (webmVp9Supported !== null) return webmVp9Supported;
  if (typeof document === "undefined") return false;
  const video = document.createElement("video");
  webmVp9Supported = video.canPlayType('video/webm; codecs="vp9"') !== "";
  return webmVp9Supported;
}

/** @deprecated Pre-baked WebM alpha — ffmpeg bake eats into eyes/edges; use DrakoKeyedVideo. */
export const DrakoAlphaVideo = memo(function DrakoAlphaVideo({
  src,
  width,
  height,
  loop = true,
  className,
  alt,
  decorative,
  onEnded,
  onError,
}: DrakoAlphaVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
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
        muted
        playsInline
        autoPlay
        preload="auto"
        onLoadedData={() => setReady(true)}
        onPlaying={() => setReady(true)}
        onError={() => onError?.()}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative ? true : undefined}
        className={cn(
          "drako-video-img block h-full w-full object-contain",
          ready ? "opacity-100" : "opacity-0",
        )}
        style={{ width, height }}
      />
    </span>
  );
});
