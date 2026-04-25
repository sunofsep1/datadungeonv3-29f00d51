import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SortableWidgetProps = {
  id: string;
  children: React.ReactNode;
  /** Remove this widget from the dashboard (persisted). */
  onRemove?: (id: string) => void;
};

/**
 * Dashboard tile: equal width in the grid, consistent minimum height, drag handle.
 */
export function SortableWidget({ id, children, onRemove }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 160ms ease",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative flex w-full flex-col rounded-lg ring-1 ring-border/60 bg-card/40 shadow-sm cursor-grab active:cursor-grabbing touch-none",
        /* Masonry-style columns: pack tiles vertically without row dead space */
        "break-inside-avoid mb-3 lg:mb-4",
        isDragging && "z-50 opacity-60 ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex w-full min-w-0">
        <div className="shrink-0 flex flex-col items-center border-r border-border/50 bg-muted/30 py-1.5 px-1 gap-0.5">
          <div className="p-1.5 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          {onRemove && (
            <button
              type="button"
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              aria-label="Remove widget from dashboard"
              title="Remove widget"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onRemove(id)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div
          className="flex-1 min-w-0 flex flex-col p-2.5 sm:p-3 [&>*]:min-h-0"
          onPointerDownCapture={(e) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const interactive = target.closest(
              'button, a, input, textarea, select, [role="button"], [data-no-drag="true"]'
            );
            if (interactive) e.stopPropagation();
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
