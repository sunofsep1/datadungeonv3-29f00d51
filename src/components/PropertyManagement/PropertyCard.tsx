import { useNavigate } from "react-router-dom";
import { MapPin, Building2, ChevronRight, Pencil, Trash2, ImageIcon, CheckSquare, Square } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPropertyAddress, type PropertyWithLinks } from "@/hooks/useProperties";

interface PropertyCardProps {
  property: PropertyWithLinks;
  selected?: boolean;
  onToggleSelect?: () => void;
  onSelect?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  showEditButton?: boolean;
}

export function PropertyCard({
  property,
  selected,
  onToggleSelect,
  onSelect,
  onEdit,
  onDelete,
  showEditButton = false,
}: PropertyCardProps) {
  const navigate = useNavigate();
  const addr = formatPropertyAddress(property);
  const imageList = Array.isArray(property.images) ? (property.images as string[]) : [];
  const thumbnail = imageList.length > 0 ? imageList[0] : null;
  const extraPhotoCount = imageList.length > 1 ? imageList.length - 1 : 0;

  const handleClick = () => {
    if (onSelect) onSelect();
    else navigate(`/properties/${property.id}`);
  };

  return (
    <Card
      className="group overflow-hidden border border-white/10 hover:bg-white/[0.06] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer zoho-card shadow-sm"
      onClick={handleClick}
    >
      {thumbnail ? (
        <div className="relative aspect-video bg-muted">
          <img
            src={thumbnail}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {extraPhotoCount > 0 ? (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-0.5 text-xs font-semibold text-white">
              +{extraPhotoCount}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="p-3 flex gap-3">
        {onToggleSelect && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 self-start"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            aria-label={selected ? "Deselect" : "Select"}
          >
            {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </Button>
        )}
        {!thumbnail && (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-white">{addr || "—"}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-white/60">
            {property.property_type && (
              <Badge variant="secondary" className="text-xs">
                {property.property_type}
              </Badge>
            )}
            {property.bedrooms != null && (
              <span>{property.bedrooms} bed</span>
            )}
            {property.bathrooms != null && (
              <span>{property.bathrooms} bath</span>
            )}
          </div>
          {(property.price != null && property.price > 0) ||
          (property.price_listed != null && property.price_listed > 0) ? (
            <p className="text-sm font-semibold text-white mt-1">
              $
              {(property.price_listed ?? property.price ?? 0).toLocaleString()}
            </p>
          ) : null}
          {property.status && (
            <Badge variant="outline" className="text-xs mt-1 capitalize">
              {property.status}
            </Badge>
          )}
        </div>
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
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
          {onDelete && (
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            aria-label="View gallery"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <ChevronRight className="w-5 h-5 text-white/50 flex-shrink-0" />
        </div>
      </div>
    </Card>
  );
}
