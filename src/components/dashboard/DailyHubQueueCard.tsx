import { Check, Loader2, RotateCcw } from "lucide-react";
import { dailyHubKindLabel, type DailyHubItem, type DailyHubScheduleRow } from "@/lib/dailyHubSchedule";
import type { DailyHubTriageZone } from "@/lib/dailyHubTriage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  urgencyTierBadgeClass,
  urgencyTierContactNameClass,
  urgencyTierLabel,
} from "@/lib/urgencyTierStyles";
import { cn } from "@/lib/utils";

function scheduleBucketHint(bucket: DailyHubScheduleRow["bucket"]): string {
  if (bucket === "overdue") return "border-red-400/30";
  if (bucket === "today") return "border-amber-400/25";
  return "border-border/70";
}

type Props = {
  item: DailyHubScheduleRow;
  zone?: DailyHubTriageZone;
  completing: boolean;
  /** Subtle zebra — every second card in a column. */
  alternateTone?: boolean;
  onOpen: (item: DailyHubItem) => void;
  onComplete: (item: DailyHubItem) => void;
  onReturnToSchedule?: () => void;
  className?: string;
};

export function DailyHubQueueCard({
  item,
  zone = "schedule",
  completing,
  alternateTone = false,
  onOpen,
  onComplete,
  onReturnToSchedule,
  className,
}: Props) {
  const isContactItem =
    item.kind === "contactTask" ||
    item.kind === "sequenceTask" ||
    item.kind === "nextTouchReminder" ||
    (item.kind === "appointment" && Boolean(item.contactId));
  const headline =
    item.kind === "todoTask"
      ? item.title
      : isContactItem && item.title
        ? item.title
        : item.kind === "appointment"
          ? item.title
          : item.detail;
  const subline =
    item.kind === "todoTask"
      ? "General task"
      : isContactItem && item.title
        ? item.detail
        : item.kind === "appointment"
          ? item.detail
          : item.title;
  const showDone =
    item.canComplete && item.kind !== "appointment" && item.kind !== "nextTouchReminder";
  const isFocus = zone === "focus";
  const showReturn = zone !== "schedule" && Boolean(onReturnToSchedule);

  return (
    <div
      className={cn(
        "flex min-h-[9.5rem] w-full flex-col gap-2 overflow-hidden rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md",
        alternateTone ? "border-border/60 bg-muted/40" : "border-border/80 bg-card/90",
        zone === "schedule" && scheduleBucketHint(item.bucket),
        isFocus && "border-primary/35 bg-primary/[0.04]",
        className,
      )}
    >
      <button
        type="button"
        className="-m-1 flex min-w-0 flex-1 flex-col rounded-lg p-1 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Open ${headline}`}
        onClick={() => onOpen(item)}
      >
        <p
          className={cn(
            "line-clamp-2 text-sm font-bold leading-snug tracking-tight",
            isContactItem ? urgencyTierContactNameClass(item.urgency) : "text-foreground",
          )}
        >
          {headline}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-foreground/85">{subline}</p>
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{item.whenText}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge variant="outline" className="border-border/80 text-[10px]">
            {dailyHubKindLabel(item.kind)}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px]", urgencyTierBadgeClass(item.urgency))}>
            {urgencyTierLabel(item.urgency)}
          </Badge>
          {zone === "schedule" ? (
            <Badge variant="outline" className="border-border/60 text-[10px] capitalize">
              {item.bucket.replace("_", " ")}
            </Badge>
          ) : null}
        </div>
      </button>
      {showDone || showReturn ? (
        <div className="mt-auto flex flex-col gap-1.5">
          {showDone ? (
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 w-full gap-1 px-2 text-[11px] font-semibold"
                disabled={completing}
                onClick={(event) => {
                  event.stopPropagation();
                  onComplete(item);
                }}
              >
                {completing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" aria-hidden />
                )}
                Done
              </Button>
            </div>
          ) : null}
          {showReturn ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-1 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onReturnToSchedule?.();
              }}
            >
              <RotateCcw className="h-3 w-3" />
              Return to Schedule
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
