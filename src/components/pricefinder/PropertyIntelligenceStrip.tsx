import { ExternalLink, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatLastSaleSummary,
  isLongHoldProperty,
  yearsSinceLastSale,
} from "@/lib/propertyReportIntel";
import { openPricefinderPortal } from "@/lib/pricefinderMode";
import { cn } from "@/lib/utils";

type Props = {
  propertyReport?: Record<string, unknown> | null;
  address?: string | null;
  propertyId?: string;
  compact?: boolean;
  className?: string;
  onUploadReport?: () => void;
};

export function PropertyIntelligenceStrip({
  propertyReport,
  address,
  propertyId,
  compact = false,
  className,
  onUploadReport,
}: Props) {
  const summary = formatLastSaleSummary(propertyReport);
  const longHold = isLongHoldProperty(propertyReport);
  const years = yearsSinceLastSale(propertyReport);

  if (!summary && !onUploadReport) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {summary ? (
        <p className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
          <span className="font-medium text-foreground">PF report:</span> {summary}
        </p>
      ) : (
        <p className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
          No imported Pricefinder report yet.
        </p>
      )}
      {longHold ? (
        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-200">
          Long hold · {years}y since sale — review touch
        </Badge>
      ) : null}
      <div className="flex flex-wrap gap-1.5 print:hidden">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[10px]"
          onClick={() => void openPricefinderPortal(address)}
        >
          <ExternalLink className="h-3 w-3" />
          Pricefinder
        </Button>
        {onUploadReport ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={onUploadReport}
          >
            <Upload className="h-3 w-3" />
            Upload report
          </Button>
        ) : propertyId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            asChild
          >
            <a href={`/properties/${propertyId}#pricefinder-research`}>
              <Upload className="h-3 w-3" />
              Import report
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
