import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  buildContractTimeline,
  contractMilestoneDetailLine,
  contractTimelinePhaseSummary,
  contractTimelineProgressLabel,
  type ContractTimelineMilestone,
  type ContractTimelineWeek,
} from "@/lib/contractTimeline";
import {
  ContractMilestoneSheet,
  type ContractEditFocusField,
} from "@/components/listings/ContractMilestoneSheet";
import { ContractWeekSheet } from "@/components/listings/ContractWeekSheet";
import { conditionStatusClass, conditionStatusLabel, type OfferCondition } from "@/lib/offerConditions";
import type { ListingOffer } from "@/hooks/useListingOffers";
import { cn } from "@/lib/utils";

type Props = {
  offer: ListingOffer;
  conditions: OfferCondition[];
  listingId: string;
  onSaveOfferDate: (field: ContractEditFocusField, dateIso: string) => Promise<void>;
  onUpdateCondition: (input: {
    id: string;
    offer_id: string;
    status?: OfferCondition["status"];
    due_date?: string;
    notes?: string | null;
  }) => Promise<void>;
  onGoUnconditional: () => Promise<void>;
  onOpenFullEditor: (focusField?: ContractEditFocusField) => void;
};

const TRACK_INSET = 5;

function plotPosition(percent: number): number {
  return TRACK_INSET + (percent / 100) * (100 - TRACK_INSET * 2);
}

function milestoneDotClass(milestone: ContractTimelineMilestone): string {
  if (milestone.kind === "contract") return "bg-primary border-primary shadow-[0_0_0_2px_hsl(var(--background))]";
  if (milestone.kind === "settlement") return "bg-emerald-500 border-emerald-600 shadow-[0_0_0_2px_hsl(var(--background))]";
  if (milestone.kind === "unconditional") return "bg-amber-500 border-amber-600 shadow-[0_0_0_2px_hsl(var(--background))]";
  if (milestone.conditionStatus === "complete" || milestone.conditionStatus === "waived") {
    return "bg-emerald-500 border-emerald-600 shadow-[0_0_0_2px_hsl(var(--background))]";
  }
  if (milestone.conditionStatus === "overdue") {
    return "bg-destructive border-destructive shadow-[0_0_0_2px_hsl(var(--background))]";
  }
  return "bg-amber-400 border-amber-500 shadow-[0_0_0_2px_hsl(var(--background))]";
}

function milestoneStatusBadge(milestone: ContractTimelineMilestone) {
  if (milestone.kind === "contract") {
    return (
      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
        Start
      </Badge>
    );
  }
  if (milestone.kind === "settlement") {
    return (
      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
        Finish
      </Badge>
    );
  }
  if (milestone.kind === "unconditional") {
    return (
      <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">
        Unconditional
      </Badge>
    );
  }
  if (milestone.conditionStatus) {
    return (
      <Badge variant="outline" className={cn("text-[10px]", conditionStatusClass(milestone.conditionStatus))}>
        {conditionStatusLabel(milestone.conditionStatus)}
      </Badge>
    );
  }
  return null;
}

function weekBandClass(week: ContractTimelineWeek, selected: boolean): string {
  if (selected) return "bg-primary/15 border-primary/45 ring-1 ring-primary/30";
  if (week.isCurrent) return "bg-primary/8 border-primary/25 hover:bg-primary/12";
  if (week.isPast) return "bg-muted/25 border-border/40 hover:bg-muted/35";
  return "bg-transparent border-border/30 hover:bg-muted/20";
}

export function ContractTimelineGraph({
  offer,
  conditions,
  listingId,
  onSaveOfferDate,
  onUpdateCondition,
  onGoUnconditional,
  onOpenFullEditor,
}: Props) {
  const model = useMemo(() => buildContractTimeline(offer, conditions), [offer, conditions]);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  const [milestoneSheetOpen, setMilestoneSheetOpen] = useState(false);
  const [activeWeekNumber, setActiveWeekNumber] = useState<number | null>(null);
  const [weekSheetOpen, setWeekSheetOpen] = useState(false);

  const activeMilestone = useMemo(
    () => model?.milestones.find((m) => m.id === activeMilestoneId) ?? null,
    [model, activeMilestoneId],
  );

  const activeWeek = useMemo(
    () => model?.weeks.find((w) => w.weekNumber === activeWeekNumber) ?? null,
    [model, activeWeekNumber],
  );

  const activeCondition = useMemo(
    () => (activeMilestone?.kind === "condition" ? conditions.find((c) => c.id === activeMilestone.id) ?? null : null),
    [activeMilestone, conditions],
  );

  const openMilestone = (milestone: ContractTimelineMilestone) => {
    setActiveMilestoneId(milestone.id);
    setMilestoneSheetOpen(true);
  };

  const openWeek = (week: ContractTimelineWeek) => {
    setActiveWeekNumber(week.weekNumber);
    setWeekSheetOpen(true);
  };

  if (!model) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Add contract and settlement dates to see the timeline.
        </p>
      </div>
    );
  }

  const progressLabel = contractTimelineProgressLabel(model);
  const phaseSummary = contractTimelinePhaseSummary(model);
  const showToday = !model.isPreStart && !model.isComplete;
  const todayLeft = plotPosition(model.todayPosition);
  const progressWidth = plotPosition(model.progressPercent);
  const unconditionalMilestone = model.milestones.find((m) => m.kind === "unconditional");
  const currentWeek = model.weeks.find((w) => w.isCurrent);

  return (
    <>
      <div className="space-y-4 min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{progressLabel}</p>
            <p className="text-xs text-muted-foreground tabular-nums truncate">
              {model.startWeekdayLabel} → {model.endWeekdayLabel}
            </p>
            {currentWeek ? (
              <p className="text-xs text-primary font-medium">
                {currentWeek.label} · Days {currentWeek.startDayOfContract}–{currentWeek.endDayOfContract}
              </p>
            ) : null}
            {showToday ? (
              <p className="text-xs text-muted-foreground">
                Today · {model.todayWeekdayLabel}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right space-y-0.5">
            <p className="text-xs font-semibold tabular-nums text-primary">
              {Math.round(model.progressPercent)}% elapsed
            </p>
            <p className="text-[10px] text-muted-foreground max-w-[12rem] sm:ml-auto">{phaseSummary}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-card/40 px-2 py-3 sm:px-3 overflow-hidden">
          <div className="relative h-[4.5rem] sm:h-16">
            {model.weeks.map((week) => {
              const left = plotPosition(week.startPosition);
              const right = plotPosition(week.endPosition);
              const width = Math.max(2, right - left);
              const selected = activeWeekNumber === week.weekNumber && weekSheetOpen;
              return (
                <button
                  key={week.weekNumber}
                  type="button"
                  className={cn(
                    "absolute top-[1.35rem] sm:top-6 z-0 h-8 sm:h-9 rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    weekBandClass(week, selected),
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  aria-label={`${week.label}, ${week.startWeekdayLabel} to ${week.endWeekdayLabel}`}
                  onClick={() => openWeek(week)}
                />
              );
            })}

            <div
              className="absolute top-[1.85rem] sm:top-[1.65rem] h-2 -translate-y-1/2 rounded-full bg-muted z-[1]"
              style={{ left: `${TRACK_INSET}%`, right: `${TRACK_INSET}%` }}
            />
            <div
              className="absolute top-[1.85rem] sm:top-[1.65rem] h-2 -translate-y-1/2 rounded-full bg-primary/90 transition-all z-[1]"
              style={{
                left: `${TRACK_INSET}%`,
                width: `${Math.max(0, progressWidth - TRACK_INSET)}%`,
              }}
            />
            {unconditionalMilestone ? (
              <div
                className="absolute top-[1.35rem] sm:top-6 bottom-2 w-px bg-amber-500/60 pointer-events-none z-[2]"
                style={{ left: `${plotPosition(unconditionalMilestone.position)}%` }}
                aria-hidden
              />
            ) : null}

            {model.milestones.map((milestone) => (
              <button
                key={milestone.id}
                type="button"
                className={cn(
                  "absolute top-[1.85rem] sm:top-[1.65rem] -translate-x-1/2 -translate-y-1/2 z-10 rounded-full p-1 transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  activeMilestoneId === milestone.id && milestoneSheetOpen && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
                style={{ left: `${plotPosition(milestone.position)}%` }}
                title={`${milestone.label} · ${milestone.weekdayLabel}`}
                aria-label={`Open ${milestone.label}, ${milestone.weekdayLabel}`}
                onClick={() => openMilestone(milestone)}
              >
                <div className={cn("h-2.5 w-2.5 rounded-full border", milestoneDotClass(milestone))} />
              </button>
            ))}

            {showToday ? (
              <div
                className="absolute top-0 bottom-6 sm:bottom-5 w-px bg-foreground/70 z-20 pointer-events-none"
                style={{ left: `${todayLeft}%` }}
              >
                <span className="absolute -top-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1 py-px text-[8px] font-bold uppercase tracking-wider text-background leading-none">
                  Today
                </span>
              </div>
            ) : null}
          </div>

          <div className="relative mt-0.5 h-6 min-w-0">
            {model.weeks.map((week) => (
              <button
                key={`label-${week.weekNumber}`}
                type="button"
                className={cn(
                  "absolute -translate-x-1/2 top-0 whitespace-nowrap rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold tabular-nums transition-colors hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                  week.isCurrent ? "text-primary" : "text-muted-foreground",
                  activeWeekNumber === week.weekNumber && weekSheetOpen && "text-primary underline underline-offset-2",
                )}
                style={{ left: `${plotPosition(week.centerPosition)}%` }}
                onClick={() => openWeek(week)}
              >
                <span className="hidden sm:inline">{week.label}</span>
                <span className="sm:hidden">{week.shortLabel}</span>
              </button>
            ))}
          </div>

          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground min-w-0 border-t border-border/30 pt-2">
            <span className="truncate">{model.startWeekdayLabel}</span>
            <span className="shrink-0 tabular-nums hidden sm:inline">
              {model.weeks.length} week{model.weeks.length === 1 ? "" : "s"} · {model.totalDays} days
            </span>
            <span className="truncate text-right">{model.endWeekdayLabel}</span>
          </div>
        </div>

        {activeWeek && weekSheetOpen ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{activeWeek.label} selected</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {activeWeek.milestoneIds.length} milestone{activeWeek.milestoneIds.length === 1 ? "" : "s"} · tap a week band or label for details
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline shrink-0"
              onClick={() => openWeek(activeWeek)}
            >
              View week
            </button>
          </div>
        ) : null}

        <ol className="space-y-1.5 min-w-0">
          {model.milestones.map((milestone) => {
            const isPast = milestone.position <= model.todayPosition && !model.isPreStart;
            const isSelected = activeMilestoneId === milestone.id && milestoneSheetOpen;
            return (
              <li key={milestone.id}>
                <button
                  type="button"
                  onClick={() => openMilestone(milestone)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-xs min-w-0 transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isPast ? "border-border/60 bg-muted/20" : "border-border/50 bg-card/30",
                    isSelected && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full border", milestoneDotClass(milestone))}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium text-foreground truncate">{milestone.label}</p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/60">
                        Week {milestone.weekOfContract}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground truncate">{contractMilestoneDetailLine(milestone)}</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">{milestone.relativeLabel}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {milestoneStatusBadge(milestone)}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Contract
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Complete
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Pending
          </span>
          {unconditionalMilestone ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Unconditional
            </span>
          ) : null}
          <span className="w-full sm:w-auto text-muted-foreground/70">
            Tap a week, milestone dot, or list row for actions
          </span>
        </div>
      </div>

      <ContractWeekSheet
        open={weekSheetOpen}
        onOpenChange={setWeekSheetOpen}
        week={activeWeek}
        milestones={model.milestones}
        onSelectMilestone={openMilestone}
        onOpenFullEditor={() => onOpenFullEditor()}
      />

      <ContractMilestoneSheet
        open={milestoneSheetOpen}
        onOpenChange={setMilestoneSheetOpen}
        milestone={activeMilestone}
        offer={offer}
        condition={activeCondition}
        listingId={listingId}
        onSaveOfferDate={onSaveOfferDate}
        onUpdateCondition={onUpdateCondition}
        onGoUnconditional={onGoUnconditional}
        onOpenFullEditor={onOpenFullEditor}
      />
    </>
  );
}
