import { Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapPickToAddressLine, type MapProspectPick } from "@/lib/mapProspectPick";
import { cn } from "@/lib/utils";

type Props = {
  pick: MapProspectPick;
  pinDropMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
};

export function MapProspectPickBar({ pick, pinDropMode, onConfirm, onCancel, className }: Props) {
  const label = pick.resolving ? "Looking up address…" : mapPickToAddressLine(pick);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-2 right-2 top-12 z-20 mx-auto max-w-md rounded-lg border border-primary/30 bg-background/95 p-3 shadow-lg backdrop-blur-sm sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">
            {pinDropMode ? "Drop pin mode" : "Add prospect here"}
          </p>
          <p className="mt-0.5 text-sm text-foreground/90 leading-snug">
            {pick.resolving ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {label}
              </span>
            ) : (
              label
            )}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Drag the purple pin to fine-tune · right-click or long-press elsewhere to move
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" className="flex-1" disabled={pick.resolving} onClick={onConfirm}>
          Create property
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
