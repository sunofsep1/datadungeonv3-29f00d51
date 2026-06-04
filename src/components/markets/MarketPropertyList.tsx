import { formatPropertyAddress, type Property } from "@/hooks/useProperties";
import type { PropertyForMarket } from "@/lib/contactMarkets";
import { hasValidCoordinates } from "@/lib/propertyGeocode";
import { cn } from "@/lib/utils";

type MapProperty = PropertyForMarket & { id: string };

type Props = {
  properties: MapProperty[];
  selectedPropertyId: string | null;
  onSelect: (propertyId: string) => void;
  className?: string;
};

export function MarketPropertyList({ properties, selectedPropertyId, onSelect, className }: Props) {
  const mappable = properties.filter(hasValidCoordinates);

  if (mappable.length === 0) {
    return (
      <p className={cn("px-3 py-2 text-xs text-muted-foreground", className)}>
        No pinned properties yet — use Drop pins on the map.
      </p>
    );
  }

  return (
    <ul className={cn("max-h-40 overflow-y-auto border-t border-border/60 text-xs", className)}>
      {mappable.map((p) => {
        const addr = formatPropertyAddress(p as Property);
        const selected = p.id === selectedPropertyId;
        return (
          <li key={p.id}>
            <button
              type="button"
              className={cn(
                "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50",
                selected && "bg-primary/10 text-primary",
              )}
              onMouseEnter={() => onSelect(p.id)}
              onClick={() => onSelect(p.id)}
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="line-clamp-2">{addr || "Property"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
