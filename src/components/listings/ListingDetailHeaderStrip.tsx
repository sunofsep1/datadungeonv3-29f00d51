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
  headerActions,
}: ListingDetailHeaderStripProps) {
  return (
    <div className="pb-1 sm:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" asChild aria-label="Back to listings">
            <Link to="/listings">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-foreground leading-tight truncate max-w-[min(100%,42rem)]">
                {address || "Listing"}
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

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {headerActions ? <div className="flex flex-wrap items-center gap-1.5 mr-auto sm:mr-0">{headerActions}</div> : null}
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
        </div>
      </div>
    </div>
  );
}
