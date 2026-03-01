import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type SortableWidgetProps = {
  id: string;
  colSpan?: 1 | 2;
  children: React.ReactNode;
};

export function SortableWidget({ id, colSpan = 1, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative rounded-xl overflow-hidden
        ${colSpan === 2 ? "lg:col-span-2" : ""}
        ${isDragging ? "z-50 opacity-90 ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
      `}
    >
      <div className="flex h-full min-h-[80px]">
        <div className="shrink-0 self-start pt-1 -ml-0.5">
          <button
            type="button"
            className="touch-none cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-muted/50 opacity-50 hover:opacity-100 transition-opacity outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 min-w-0 group">{children}</div>
      </div>
    </div>
  );
}
