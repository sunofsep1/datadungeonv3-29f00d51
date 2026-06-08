import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { DailyHubQueueCard } from "@/components/dashboard/DailyHubQueueCard";
import type { DailyHubItem, DailyHubScheduleRow } from "@/lib/dailyHubSchedule";
import type { DailyHubTriageZone } from "@/lib/dailyHubTriage";
import { cn } from "@/lib/utils";

type Props = {
  item: DailyHubScheduleRow;
  zone: DailyHubTriageZone;
  completing: boolean;
  alternateTone?: boolean;
  onOpen: (item: DailyHubItem) => void;
  onComplete: (item: DailyHubItem) => void;
  onReturnToSchedule?: () => void;
};

export function DraggableHubQueueCard({
  item,
  zone,
  completing,
  alternateTone = false,
  onOpen,
  onComplete,
  onReturnToSchedule,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", zone, item },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex w-full min-w-0 gap-1",
        isDragging && "z-0 opacity-0",
      )}
    >
      <button
        type="button"
        className="mt-2.5 shrink-0 touch-none cursor-grab self-start rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted/80 hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to move between columns"
        title="Drag to move"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <DailyHubQueueCard
        item={item}
        zone={zone}
        completing={completing}
        alternateTone={alternateTone}
        onOpen={onOpen}
        onComplete={onComplete}
        onReturnToSchedule={onReturnToSchedule}
        className="min-w-0 flex-1"
      />
    </div>
  );
}
