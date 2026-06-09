import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PrimaryCampaignStage, CampaignHealthResult } from "@/lib/listingCampaignDashboard";

type ListingDetailHeaderStripProps = {
  listingId: string;
  address: string;
  suburb: string | null;
  primaryStage: PrimaryCampaignStage;
  secondaryTags: string[];
  daysInStage: number;
  stageLabelForDays: string;
  health: CampaignHealthResult;
  /** Hub route when user taps back (Appraisals vs Listings). */
  backHref?: string;
  backLabel?: string;
  /** Fallback when address is empty — e.g. Appraisal vs Listing. */
  entityFallback?: string;
  /** Shown under Sold badge — e.g. Settling 16 Jun 2026 */
  soldSubtitle?: string | null;
  /** Share / edit etc. */
  headerActions?: ReactNode;
};

export function ListingDetailHeaderStrip({
  listingId,
  address,
  suburb,
  primaryStage,
  secondaryTags,
  daysInStage,
  stageLabelForDays,
  health,
  backHref = "/listings",
  backLabel = "Back to listings",
  entityFallback = "Listing",
  soldSubtitle = null,
  headerActions,
}: ListingDetailHeaderStripProps) {
  const isSold = primaryStage.key === "sold";
  return (
    <div className="pb-1 sm:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" asChild aria-label={backLabel}>
            <Link to={backHref}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-foreground leading-tight truncate max-w-[min(100%,42rem)]">
                {address || entityFallback}
              </h1>
              {suburb ? (
                <Badge variant="secondary" className="shrink-0 text-xs font-normal bg-muted text-muted-foreground">
                  {suburb}
                </Badge>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono tabular-nums">ID {listingId.slice(0, 8)}…</p>
          </div>
        </div>

        <div
          className={
            isSold
              ? "flex w-full min-w-0 flex-col items-stretch gap-5 sm:ml-6 sm:w-auto sm:min-w-[12rem] sm:items-end"
              : "flex flex-wrap items-start gap-2 sm:justify-end sm:items-center"
          }
        >
          {headerActions ? (
            <div
              className={
                isSold
                  ? "flex flex-wrap items-center justify-end gap-1.5"
                  : "flex flex-wrap items-center gap-1.5 mr-auto sm:mr-0"
              }
            >
              {headerActions}
            </div>
          ) : null}
          {!isSold ? (
            <>
              <div
                className={`inline-flex items-center rounded-lg border px-3.5 py-2 text-sm font-semibold tracking-tight ${primaryStage.badgeClass}`}
              >
                {primaryStage.label}
              </div>
              {secondaryTags.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="text-[10px] font-medium uppercase tracking-wide border-border/80 text-muted-foreground"
                >
                  {t}
                </Badge>
              ))}
              <div className="w-full sm:w-auto sm:pl-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {daysInStage}d in {stageLabelForDays}
                </span>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/50 px-2.5 py-1.5 text-left hover:bg-muted/40 transition-colors"
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${health.dotClass}`} aria-hidden />
                        <span className="text-foreground font-medium">{health.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {health.description}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-end gap-1.5 text-right">
              <div
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-950/40 px-3 py-1 backdrop-blur-sm"
                aria-label={soldSubtitle ? `Sold — ${soldSubtitle}` : "Sold"}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]"
                  aria-hidden
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  Sold
                </span>
              </div>
              {soldSubtitle ? (
                <p className="max-w-[14rem] text-xs font-medium leading-snug text-emerald-200/85 sm:max-w-none sm:whitespace-nowrap">
                  {soldSubtitle}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
