import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadStreetViewPanorama } from "@/lib/marketStreetView";
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
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    let cancelled = false;
    setUnavailable(false);

    void loadStreetViewPanorama(containerRef.current, lat, lng).then((ok) => {
      if (cancelled) return;
      if (!ok) setUnavailable(true);
    });

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [open, lat, lng]);

  if (!open) return null;

  return (
    <div className={cn("relative flex flex-col border-t border-border/80 bg-muted/30", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <p className="truncate text-xs font-medium text-foreground">
          Street View{label ? ` · ${label}` : ""}
        </p>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {unavailable ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
          No Street View at this address — try the map pegman or a nearby pin.
        </p>
      ) : (
        <div ref={containerRef} className="min-h-[200px] w-full flex-1 md:min-h-[240px]" />
      )}
    </div>
  );
}
