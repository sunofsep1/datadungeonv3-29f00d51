import { useNavigate } from "react-router-dom";
import { MapPin, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPropertyAddress, type PropertyWithLinks } from "@/hooks/useProperties";
import { cn } from "@/lib/utils";

interface PropertyListRowProps {
  property: PropertyWithLinks;
  onSelect?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  showEditButton?: boolean;
}

export function PropertyListRow({
  property,
  onSelect,
  onEdit,
  onDelete,
  showEditButton = false,
}: PropertyListRowProps) {
  const navigate = useNavigate();
  const addr = formatPropertyAddress(property);
  const imageList = Array.isArray(property.images) ? (property.images as string[]) : [];
  const thumbnail = imageList.length > 0 ? imageList[0] : null;
  const price = (property.price_listed ?? property.price ?? 0) > 0
    ? `$${(property.price_listed ?? property.price ?? 0).toLocaleString()}`
    : "—";

  const handleClick = () => {
    if (onSelect) onSelect();
    else navigate(`/properties/${property.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "group flex flex-wrap items-center gap-3 sm:gap-4 p-3 rounded-lg border border-white/10 bg-card hover:bg-white/[0.06] transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/20">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-0.5 text-sm">
        <p className="font-medium text-foreground truncate">{addr || "—"}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          {property.property_type && (
            <Badge variant="secondary" className="text-xs font-normal">
              {property.property_type}
            </Badge>
          )}
          {property.bedrooms != null && <span>{property.bedrooms} bed</span>}
          {property.bathrooms != null && <span>{property.bathrooms} bath</span>}
        </div>
        <p className="text-foreground font-medium">{price}</p>
        {property.status && (
          <Badge variant="outline" className="text-xs capitalize w-fit">
            {property.status}
          </Badge>
        )}
      </div>
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {showEditButton && onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e);
            }}
            aria-label="Edit property"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        {showEditButton && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            aria-label="Delete property"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}
