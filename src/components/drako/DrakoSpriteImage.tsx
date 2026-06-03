import { forwardRef } from "react";
import type { DrakoMood } from "./types";
import { DRAKO_ALT } from "./types";
import { getDrakoVideoAsset } from "./drakoVideos";
import { DrakoKeyedVideo, type DrakoKeyedVideoHandle } from "./DrakoKeyedVideo";
import { cn } from "@/lib/utils";

interface DrakoSpriteImageProps {
  mood: DrakoMood;
  width: number;
  className?: string;
  alt?: string;
  decorative?: boolean;
  preferVideo?: boolean;
  muted?: boolean;
  renderScale?: number;
  onVideoEnded?: () => void;
}

/** Renders chroma-keyed live loop (MP4) or transparent pixel PNG fallback. */
export const DrakoSpriteImage = forwardRef<DrakoKeyedVideoHandle, DrakoSpriteImageProps>(
  function DrakoSpriteImage(
    {
      mood,
      width,
      className,
      alt,
      decorative,
      preferVideo = true,
      muted = true,
      renderScale,
      onVideoEnded,
    },
    ref,
  ) {
  const videoAsset = getDrakoVideoAsset(mood);
  const height = Math.round(width * (videoAsset ? 1 : 0.75));

  if (preferVideo && videoAsset) {
    return (
      <DrakoKeyedVideo
        ref={ref}
        src={videoAsset.src}
        keyConfig={videoAsset.key}
        loop={videoAsset.loop ?? true}
        muted={muted}
        renderScale={renderScale}
        width={width}
        height={height}
        className={className}
        alt={alt ?? DRAKO_ALT[mood]}
        decorative={decorative}
        onEnded={onVideoEnded}
      />
    );
  }

  return (
    <picture className={cn("drako-sprite inline-block leading-none", className)}>
      <source type="image/webp" srcSet={`/drako/drako-${mood}.webp`} />
      <img
        src={`/drako/drako-${mood}.png`}
        srcSet={`/drako/drako-${mood}@2x.png 2x`}
        alt={decorative ? "" : (alt ?? DRAKO_ALT[mood])}
        width={width}
        height={height}
        draggable={false}
        className="drako-sprite-img block h-auto max-w-none"
        aria-hidden={decorative ? true : undefined}
      />
    </picture>
  );
});
