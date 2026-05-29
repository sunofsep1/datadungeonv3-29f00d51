import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const DRAKO_LAIR_BG = "/drako/lair/dungeon-bg.png";
export const DRAKO_LAIR_BG_VIDEO = "/drako/lair/dungeon-bg.mp4?v=20260529b";
export const DRAKO_TROPHY_WALL_BG = "/drako/lair/trophy-wall-bg.png";

interface DrakoLairBackgroundProps {
  className?: string;
  imageClassName?: string;
}

function LairBgFallback() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, hsl(var(--primary) / 0.12), transparent 70%), linear-gradient(180deg, hsl(240 18% 8%) 0%, hsl(240 22% 5%) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, hsl(var(--foreground) / 0.06) 0px, hsl(var(--foreground) / 0.06) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(0deg, hsl(var(--foreground) / 0.04) 0px, hsl(var(--foreground) / 0.04) 1px, transparent 1px, transparent 48px)",
        }}
      />
    </>
  );
}

export function DrakoLairBackground({ className, imageClassName }: DrakoLairBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    void video.play().catch(() => setVideoFailed(true));
  }, [videoFailed]);

  const showVideo = !videoFailed;
  const mediaClass = cn(
    "absolute inset-0 h-full w-full object-cover object-[center_55%] transition-opacity duration-700",
    imageClassName,
    ready ? "opacity-100" : "opacity-0",
  );

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none bg-black/40", className)}>
      {!ready && <LairBgFallback />}

      {showVideo ? (
        <video
          ref={videoRef}
          src={DRAKO_LAIR_BG_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden
          onLoadedData={() => setReady(true)}
          onCanPlay={() => setReady(true)}
          onError={() => setVideoFailed(true)}
          className={mediaClass}
        />
      ) : (
        <img
          src={DRAKO_LAIR_BG}
          alt=""
          aria-hidden
          onLoad={() => setReady(true)}
          className={mediaClass}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
    </div>
  );
}
