import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DraggableHubQueueCard } from "@/components/dashboard/DraggableHubQueueCard";
import type { DailyHubItem, DailyHubScheduleRow } from "@/lib/dailyHubSchedule";
import {
  columnIdForZone,
  DAILY_HUB_KANBAN_COLUMN_WIDTH,
  DAILY_HUB_ZONE_META,
  DAILY_HUB_ZONE_STYLE,
  type DailyHubTriageZone,
} from "@/lib/dailyHubTriage";
import { cn } from "@/lib/utils";

type Props = {
  zone: DailyHubTriageZone;
  items: DailyHubScheduleRow[];
  completingId: string | null;
  onOpen: (item: DailyHubItem, zone: DailyHubTriageZone) => void;
  onComplete: (item: DailyHubItem) => void;
  onReturnToSchedule: (itemId: string) => void;
};

export function DailyHubKanbanColumn({
  zone,
  items,
  completingId,
  onOpen,
  onComplete,
  onReturnToSchedule,
}: Props) {
  const meta = DAILY_HUB_ZONE_META[zone];
  const style = DAILY_HUB_ZONE_STYLE[zone];
  const { setNodeRef, isOver } = useDroppable({ id: columnIdForZone(zone) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "zoho-card flex min-h-[22rem] snap-start flex-col overflow-hidden rounded-2xl border transition-[box-shadow,ring-color,border-color,background-color] duration-200",
        DAILY_HUB_KANBAN_COLUMN_WIDTH,
        style.shellClass,
        isOver && "border-primary/50 bg-primary/[0.08] ring-2 ring-primary/30",
      )}
    >
      <div className={cn("border-b border-border/50 px-4 py-3.5", style.headerClass)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", style.dotClass)} aria-hidden />
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">{meta.label}</p>
            </div>
            <p className="mt-1 pl-[1.125rem] text-[11px] leading-snug text-muted-foreground">{meta.subtitle}</p>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-border/70 bg-background/60 px-2 py-0.5 text-[11px] tabular-nums"
          >
            {items.length}
          </Badge>
        </div>
      </div>

      <div className="flex min-h-[16rem] flex-1 flex-col gap-2.5 overflow-y-auto p-3 [scrollbar-gutter:stable]">
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/55 bg-background/25 px-4 py-12 text-center">
              <Inbox className="mb-2.5 h-5 w-5 text-muted-foreground/50" aria-hidden />
              <p className="text-xs font-medium text-muted-foreground/80">Drop items here</p>
            </div>
          ) : (
            items.map((item, index) => (
              <DraggableHubQueueCard
                key={item.id}
                item={item}
                zone={zone}
                completing={completingId === item.id}
                alternateTone={index % 2 === 1}
                onOpen={(item) => onOpen(item, zone)}
                onComplete={onComplete}
                onReturnToSchedule={() => onReturnToSchedule(item.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
