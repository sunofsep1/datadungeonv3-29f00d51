import { useState } from "react";
import { ExternalLink, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPropertyAddress, type Property } from "@/hooks/useProperties";
import type { PropertyForMarket, PropertyPinUrgency } from "@/lib/contactMarkets";
import { hasValidCoordinates } from "@/lib/propertyGeocode";
import type { PropertyOwnerLink } from "@/components/markets/MarketMapPanel";
import { cn } from "@/lib/utils";

type MapProperty = PropertyForMarket & { id: string };

const URGENCY_RANK: Record<PropertyPinUrgency, number> = {
  immediate: 4,
  priority: 3,
  planned: 2,
  backlog: 1,
};

const URGENCY_BADGE: Record<PropertyPinUrgency, { label: string; dotColor: string; textColor: string }> = {
  immediate: { label: "Overdue",  dotColor: "#EF4444", textColor: "text-red-500" },
  priority:  { label: "Due soon", dotColor: "#F59E0B", textColor: "text-amber-500" },
  planned:   { label: "On track", dotColor: "#00BCD4", textColor: "text-cyan-500" },
  backlog:   { label: "Backlog",  dotColor: "#64748B", textColor: "text-slate-400" },
};

function formatRelativeDate(d: Date): string {
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 31) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

type Props = {
  properties: MapProperty[];
  selectedPropertyId: string | null;
  onSelect: (propertyId: string) => void;
  propertyUrgencyById?: Record<string, PropertyPinUrgency>;
  propertyLastTouchById?: Record<string, Date>;
  ownerLinksByPropertyId?: Record<string, PropertyOwnerLink[]>;
  className?: string;
};

export function MarketPropertyList({
  properties,
  selectedPropertyId,
  onSelect,
  propertyUrgencyById = {},
  propertyLastTouchById = {},
  ownerLinksByPropertyId = {},
  className,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const mappable = properties
    .filter(hasValidCoordinates)
    .slice()
    .sort((a, b) => {
      const ua = URGENCY_RANK[propertyUrgencyById[a.id] ?? "backlog"];
      const ub = URGENCY_RANK[propertyUrgencyById[b.id] ?? "backlog"];
      return ub - ua;
    });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePlanRoute = () => {
    const selected = mappable.filter((p) => selectedIds.has(p.id));
    if (selected.length === 0) return;
    const waypoints = selected
      .map((p) => `${p.latitude!},${p.longitude!}`)
      .join("/");
    window.open(`https://www.google.com/maps/dir/${waypoints}`, "_blank", "noopener,noreferrer");
  };

  if (mappable.length === 0) {
    return (
      <p className={cn("px-3 py-2 text-xs text-muted-foreground", className)}>
        No pinned properties yet — use Drop pins on the map.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {selectedIds.size > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">{selectedIds.size} selected</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={handlePlanRoute}
          >
            <Route className="h-3 w-3" />
            Plan route
            <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-60" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}
      <ul className="overflow-y-auto text-xs">
        {mappable.map((p) => {
          const addr = formatPropertyAddress(p as Property);
          const selected = p.id === selectedPropertyId;
          const checked = selectedIds.has(p.id);
          const urgency = propertyUrgencyById[p.id];
          const badge = urgency ? URGENCY_BADGE[urgency] : null;
          const lastTouch = propertyLastTouchById[p.id];
          const owners = ownerLinksByPropertyId[p.id] ?? [];
          const ownerName = owners[0]?.contactName;

          return (
            <li key={p.id} className="group">
              <div
                className={cn(
                  "flex w-full items-start gap-2 px-2 py-2 transition-colors hover:bg-muted/50",
                  selected && "bg-primary/10",
                )}
              >
                <div
                  className="mt-0.5 shrink-0"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSelect(p.id)}
                    className="h-3.5 w-3.5"
                    aria-label={`Select ${addr || "property"}`}
                  />
                </div>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onSelect(p.id)}
                >
                  <span className={cn("line-clamp-1 leading-tight", selected && "text-primary font-medium")}>
                    {addr || "Property"}
                  </span>
                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {badge && (
                      <span className={cn("flex items-center gap-0.5", badge.textColor)}>
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: badge.dotColor }}
                        />
                        <span className="text-[10px] font-medium">{badge.label}</span>
                      </span>
                    )}
                    {lastTouch ? (
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeDate(lastTouch)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">No touch</span>
                    )}
                    {ownerName && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                        · {ownerName}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
