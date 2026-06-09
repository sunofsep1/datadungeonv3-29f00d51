import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Home, ImageIcon, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getMosaicGridClassName,
  getMosaicTileClassName,
  getPropertyMosaicTiles,
} from "@/lib/propertyMosaicSlots";
import { cn } from "@/lib/utils";

export type PropertyHeroMosaicProps = {
  images: string[];
  onOpenGallery: (index?: number) => void;
  onAddPhotos: () => void;
  className?: string;
};

function MosaicTileButton({
  url,
  className,
  overlay,
  ariaLabel,
  onClick,
}: {
  url?: string;
  className: string;
  overlay?: ReactNode;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={onClick}>
      {url ? (
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-[1.02]" loading="lazy" />
      ) : null}
      {overlay}
    </button>
  );
}

export function PropertyHeroMosaic({ images, onOpenGallery, onAddPhotos, className }: PropertyHeroMosaicProps) {
  const [mobileIndex, setMobileIndex] = useState(0);
  const tiles = getPropertyMosaicTiles(images.length);
  const safeMobileIndex = images.length > 0 ? Math.min(mobileIndex, images.length - 1) : 0;

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl overflow-hidden border border-border bg-gradient-to-br from-muted via-muted/80 to-primary/10",
          className,
        )}
      >
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-muted-foreground sm:min-h-[320px]">
          <Home className="h-14 w-14 opacity-40" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No photos yet</p>
            <p className="mt-1 max-w-xs text-xs">Add photos to show a hero image on cards and the detail page.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={onAddPhotos}>
            <ImageIcon className="h-4 w-4" />
            Add photos
          </Button>
        </div>
      </div>
    );
  }

  const goMobile = (delta: number) => {
    setMobileIndex((i) => {
      const next = i + delta;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  };

  return (
    <div className={cn("rounded-xl overflow-hidden border border-border", className)}>
      {/* Mobile: single hero */}
      <div className="relative min-h-[280px] bg-muted sm:hidden">
        <img
          src={images[safeMobileIndex]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {images.length > 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full bg-background/90 shadow-md"
              onClick={() => goMobile(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full bg-background/90 shadow-md"
              onClick={() => goMobile(1)}
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <div className="absolute bottom-14 left-0 right-0 z-10 flex justify-center gap-1">
              {images.map((u, i) => (
                <button
                  key={u + i}
                  type="button"
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === safeMobileIndex ? "w-6 bg-white" : "w-1.5 bg-white/50",
                  )}
                  onClick={() => setMobileIndex(i)}
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}

        <div className="absolute bottom-3 left-3 right-3 z-10 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 rounded-full bg-background/90 px-3 text-xs shadow-md"
            onClick={() => onOpenGallery(safeMobileIndex)}
          >
            <Images className="h-3.5 w-3.5" />
            View all ({images.length})
          </Button>
        </div>
      </div>

      {/* Desktop: REA mosaic */}
      <div className={cn("hidden sm:grid", getMosaicGridClassName(tiles.length))}>
        {tiles.map((tile, slotIndex) => {
          const url = images[tile.imageIndex];
          const tileClass = getMosaicTileClassName(slotIndex, tiles.length);

          if (tile.kind === "more") {
            return (
              <MosaicTileButton
                key={`more-${tile.imageIndex}`}
                url={url}
                className={tileClass}
                ariaLabel={`View ${tile.extraCount} more photos`}
                onClick={() => onOpenGallery(tile.imageIndex)}
                overlay={
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white">
                    <Images className="mb-1 h-6 w-6 opacity-90" />
                    <span className="text-sm font-semibold">+{tile.extraCount} more</span>
                  </div>
                }
              />
            );
          }

          return (
            <MosaicTileButton
              key={`img-${tile.imageIndex}`}
              url={url}
              className={tileClass}
              ariaLabel={`View photo ${tile.imageIndex + 1}`}
              onClick={() => onOpenGallery(tile.imageIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}
