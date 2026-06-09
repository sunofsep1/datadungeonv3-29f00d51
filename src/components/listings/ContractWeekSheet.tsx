import { Calendar, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  contractWeekDetailLine,
  type ContractTimelineMilestone,
  type ContractTimelineWeek,
} from "@/lib/contractTimeline";
import { conditionStatusClass, conditionStatusLabel } from "@/lib/offerConditions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: ContractTimelineWeek | null;
  milestones: ContractTimelineMilestone[];
  onSelectMilestone: (milestone: ContractTimelineMilestone) => void;
  onOpenFullEditor: () => void;
};

function milestoneKindLabel(kind: ContractTimelineMilestone["kind"]): string {
  if (kind === "contract") return "Contract";
  if (kind === "settlement") return "Settlement";
  if (kind === "unconditional") return "Unconditional";
  return "Condition";
}

export function ContractWeekSheet({
  open,
  onOpenChange,
  week,
  milestones,
  onSelectMilestone,
  onOpenFullEditor,
}: Props) {
  if (!week) return null;

  const weekMilestones = milestones.filter((m) => week.milestoneIds.includes(m.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-6">{week.label}</SheetTitle>
          <SheetDescription>{contractWeekDetailLine(week)}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {week.isCurrent ? (
                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                  Current week
                </Badge>
              ) : null}
              {week.isPast ? (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Completed
                </Badge>
              ) : null}
              {week.isFuture ? (
                <Badge variant="outline" className="text-[10px] border-sky-500/30 text-sky-600 dark:text-sky-400">
                  Upcoming
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px] capitalize">
                {week.phase} phase
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                {week.startWeekdayLabel} – {week.endWeekdayLabel}
              </span>
            </div>
          </div>

          {weekMilestones.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Milestones this week
              </p>
              <ul className="space-y-1.5">
                {weekMilestones.map((milestone) => (
                  <li key={milestone.id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2.5 text-left text-xs hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => {
                        onOpenChange(false);
                        onSelectMilestone(milestone);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{milestone.label}</p>
                        <p className="text-muted-foreground truncate">
                          {milestone.weekdayLabel} · Day {milestone.dayOfContract}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {milestoneKindLabel(milestone.kind)}
                        </Badge>
                        {milestone.conditionStatus ? (
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", conditionStatusClass(milestone.conditionStatus))}
                          >
                            {conditionStatusLabel(milestone.conditionStatus)}
                          </Badge>
                        ) : null}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">No milestones scheduled this week.</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Use the contract editor to add conditions or adjust dates.
              </p>
            </div>
          )}

          <Button type="button" variant="outline" className="w-full" onClick={onOpenFullEditor}>
            Open full contract editor
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
