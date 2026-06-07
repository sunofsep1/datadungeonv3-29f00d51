import { useEffect, useRef, useState } from "react";
import { Expand, ExternalLink, ImageDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadStreetViewPanorama, streetViewStaticImageUrl } from "@/lib/marketStreetView";
import { getGoogleMapsApiKey } from "@/lib/loadGoogleMaps";
import { cn } from "@/lib/utils";

type Props = {
  lat: number;
  lng: number;
  label?: string;
  open: boolean;
  onClose: () => void;
  className?: string;
};

export function MarketStreetViewPanel({ lat, lng, label, open, onClose, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    let cancelled = false;
    setUnavailable(false);
    panoRef.current = null;

    void loadStreetViewPanorama(containerRef.current, lat, lng).then((pano) => {
      if (cancelled) return;
      if (!pano) {
        setUnavailable(true);
      } else {
        panoRef.current = pano;
      }
    });

    return () => {
      cancelled = true;
      panoRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [open, lat, lng]);

  // Track browser fullscreen state
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  };

  const handleSaveImage = () => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) return;

    const pano = panoRef.current;
    let heading = 0;
    let pitch = 0;
    let useLat = lat;
    let useLng = lng;

    if (pano) {
      const pov = pano.getPov();
      heading = pov.heading ?? 0;
      pitch = pov.pitch ?? 0;
      const pos = pano.getPosition();
      if (pos) {
        useLat = pos.lat();
        useLng = pos.lng();
      }
    }

    const url = streetViewStaticImageUrl(useLat, useLng, apiKey, heading, pitch, "640x480");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!open) return null;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative flex flex-col border-t border-border/80 bg-muted/30",
        isFullscreen && "border-0",
        className,
      )}
    >
      <div className={cn(
        "flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5",
        isFullscreen && "absolute top-0 left-0 right-0 z-10 bg-black/60 border-0 backdrop-blur-sm",
      )}>
        <p className="truncate text-xs font-medium text-foreground">
          {isFullscreen ? (
            <span className="text-white">{label ?? "Street View"}</span>
          ) : (
            <>Street View{label ? ` · ${label}` : ""}</>
          )}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {!unavailable && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", isFullscreen && "text-white hover:bg-white/20")}
                onClick={handleSaveImage}
                title="Open current view as image (save from browser)"
              >
                <ImageDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", isFullscreen && "text-white hover:bg-white/20")}
                onClick={handleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                <Expand className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {unavailable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              title="Open in Google Maps Street View"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 shrink-0", isFullscreen && "text-white hover:bg-white/20")}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {unavailable ? (
        <div className="flex flex-col items-center gap-3 px-3 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            No Street View at this address — try the map pegman or a nearby pin.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() =>
              window.open(
                `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <ExternalLink className="h-3 w-3" />
            Open in Google Maps
          </Button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className={cn(
            "min-h-[200px] w-full flex-1 md:min-h-[240px]",
            isFullscreen && "min-h-0 h-full",
          )}
        />
      )}
    </div>
  );
}
