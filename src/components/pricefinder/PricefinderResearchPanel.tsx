import React, { useId, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricefinderWidgetSlot } from "@/components/pricefinder/PricefinderWidgetSlot";
import { usePricefinderMode } from "@/hooks/usePricefinderMode";
import type { ParsedPropertyReport } from "@/lib/parsePropertyReportPdf";
import type { PricefinderPropertyData } from "@/lib/pricefinderTypes";
import { splitOwnerNames } from "@/lib/ownerNameParse";
import { copyTextToClipboard, openPricefinderPortal, markPricefinderApiUnavailable } from "@/lib/pricefinderMode";
import { isPricefinderConfiguredError } from "@/lib/pricefinderClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  propertyId?: string;
  address?: string | null;
  variant?: "card" | "compact";
  className?: string;
  parsedReport?: ParsedPropertyReport | null;
  enrichedData?: PricefinderPropertyData | null;
  uploadLoading?: boolean;
  applyLoading?: boolean;
  enrichLoading?: boolean;
  onUploadReport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyReport?: () => void;
  onDismissReport?: () => void;
  onApplyEnriched?: () => void;
  onDismissEnriched?: () => void;
  onEnrichFromApi?: () => void;
  showWidgetSlot?: boolean;
  uploadInputId?: string;
};

function ParsedReportPreview({ parsed }: { parsed: ParsedPropertyReport }) {
  return (
    <dl className="space-y-2 text-sm">
      {parsed.address_line1 && (
        <>
          <dt className="text-muted-foreground">Address</dt>
          <dd className="font-medium">
            {[parsed.address_line1, parsed.city, parsed.state, parsed.postcode].filter(Boolean).join(", ")}
          </dd>
        </>
      )}
      {parsed.owner_names && (
        <>
          <dt className="text-muted-foreground">Owner(s)</dt>
          <dd className="font-medium">
            {splitOwnerNames(parsed.owner_names).length > 1 ? (
              <ul className="list-disc pl-4 space-y-0.5">
                {splitOwnerNames(parsed.owner_names).map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              parsed.owner_names
            )}
          </dd>
        </>
      )}
      {parsed.property_type_full && (
        <>
          <dt className="text-muted-foreground">Property type</dt>
          <dd className="font-medium">{parsed.property_type_full}</dd>
        </>
      )}
      {parsed.lot_plan && (
        <>
          <dt className="text-muted-foreground">RPD</dt>
          <dd className="font-medium">{parsed.lot_plan}</dd>
        </>
      )}
      {(parsed.bedrooms != null || parsed.bathrooms != null) && (
        <>
          <dt className="text-muted-foreground">Bed / bath</dt>
          <dd className="font-medium">
            {parsed.bedrooms ?? "—"} / {parsed.bathrooms ?? "—"}
          </dd>
        </>
      )}
      {parsed.sales_history?.length ? (
        <>
          <dt className="text-muted-foreground">Last sale (report)</dt>
          <dd className="font-medium">
            {parsed.sales_history[0]?.amount != null
              ? `$${parsed.sales_history[0].amount.toLocaleString()}`
              : "—"}
            {parsed.sales_history[0]?.date ? ` · ${parsed.sales_history[0].date}` : ""}
          </dd>
        </>
      ) : null}
    </dl>
  );
}

export function PricefinderResearchPanel({
  propertyId,
  address,
  variant = "card",
  className,
  parsedReport,
  enrichedData,
  uploadLoading = false,
  applyLoading = false,
  enrichLoading = false,
  onUploadReport,
  onApplyReport,
  onDismissReport,
  onApplyEnriched,
  onDismissEnriched,
  onEnrichFromApi,
  showWidgetSlot = variant === "card",
  uploadInputId,
}: Props) {
  const autoId = useId();
  const inputId = uploadInputId ?? `pf-report-upload-${autoId}`;
  const { mode } = usePricefinderMode();
  const { toast } = useToast();
  const [openingPortal, setOpeningPortal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (!address?.trim()) return;
    await copyTextToClipboard(address.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      await openPricefinderPortal(address);
      if (address?.trim()) {
        toast({
          title: "Opening Pricefinder",
          description: "Search page opened with address pre-filled. Also copied to clipboard as backup.",
        });
      }
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleApiEnrich = () => {
    if (!onEnrichFromApi) return;
    try {
      onEnrichFromApi();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (isPricefinderConfiguredError(msg)) markPricefinderApiUnavailable();
    }
  };

  const isCompact = variant === "compact";

  return (
    <div
      id={propertyId ? "pricefinder-research" : undefined}
      className={cn(isCompact ? "space-y-2" : "space-y-4", className)}
    >
      {parsedReport ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Parsed from uploaded Pricefinder PDF. Review and apply.</p>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <ParsedReportPreview parsed={parsedReport} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onApplyReport} disabled={applyLoading}>
              {applyLoading ? "Applying…" : "Apply to property"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismissReport}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : enrichedData ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Live Pricefinder API data. Review and apply.</p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {enrichedData.bedrooms != null && (
              <div>
                <span className="text-muted-foreground">Bedrooms</span>
                <p className="font-medium">{enrichedData.bedrooms}</p>
              </div>
            )}
            {enrichedData.last_sale_price != null && (
              <div>
                <span className="text-muted-foreground">Last sale</span>
                <p className="font-medium">${Number(enrichedData.last_sale_price).toLocaleString()}</p>
              </div>
            )}
            {enrichedData.land_area_sqm != null && (
              <div>
                <span className="text-muted-foreground">Land</span>
                <p className="font-medium">{enrichedData.land_area_sqm} m²</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onApplyEnriched} disabled={applyLoading}>
              Apply to property
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismissEnriched}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : (
        <>
          {address?.trim() ? (
            <div className="flex items-center gap-1 min-w-0">
              <span className={cn("truncate text-muted-foreground font-mono", isCompact ? "text-[11px]" : "text-xs")}>
                {address.trim()}
              </span>
              <button
                type="button"
                onClick={() => void handleCopyAddress()}
                title="Copy address"
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          ) : null}
          <p className={cn("text-muted-foreground", isCompact ? "text-[11px]" : "text-xs")}>
            Research in Pricefinder, download a property report PDF, then upload here — no REST API needed.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {onUploadReport ? (
              <>
                <input
                  id={inputId}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={onUploadReport}
                  aria-label="Upload Pricefinder property report PDF"
                />
                <label
                  htmlFor={inputId}
                  className={cn(
                    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90",
                    uploadLoading && "pointer-events-none opacity-50",
                    isCompact && "h-8 px-2 text-xs",
                  )}
                >
                  {uploadLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadLoading ? "Parsing…" : "Upload Property Report"}
                </label>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size={isCompact ? "sm" : "default"}
              className={isCompact ? "h-8 text-xs" : undefined}
              disabled={openingPortal}
              onClick={() => void handleOpenPortal()}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open in Pricefinder
            </Button>
            {mode === "api" && onEnrichFromApi ? (
              <Button
                type="button"
                variant="outline"
                size={isCompact ? "sm" : "default"}
                className={isCompact ? "h-8 text-xs" : undefined}
                disabled={enrichLoading}
                onClick={handleApiEnrich}
              >
                {enrichLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                )}
                Enrich from API
              </Button>
            ) : null}
          </div>
          {mode === "pdf" && !isCompact ? (
            <p className="text-[11px] text-muted-foreground">
              Live API enrich is off until OAuth credentials are added in Supabase. PDF import is the recommended path.
            </p>
          ) : null}
        </>
      )}

      {showWidgetSlot ? <PricefinderWidgetSlot className="mt-2" /> : null}
    </div>
  );
}
