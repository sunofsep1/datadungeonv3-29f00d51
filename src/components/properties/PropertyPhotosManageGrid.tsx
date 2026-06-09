import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PropertyPhotoManager } from "@/hooks/usePropertyPhotoManager";
import { cn } from "@/lib/utils";

function SortablePhotoTile({
  url,
  index,
  isCover,
  busy,
  onDelete,
  size = "sheet",
}: {
  url: string;
  index: number;
  isCover: boolean;
  busy: boolean;
  onDelete: () => void;
  size?: "sheet" | "compact";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const isCompact = size === "compact";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30 group",
        isCompact ? "h-[100px] w-[140px] sm:h-[110px] sm:w-[160px]" : "aspect-square w-full",
        isDragging && "z-50 opacity-90 ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <img
        src={url}
        alt=""
        className="pointer-events-none h-full w-full object-cover"
        loading={index === 0 ? "eager" : "lazy"}
      />
      <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 sm:p-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded-md bg-white/90 p-1 text-black hover:bg-white active:cursor-grabbing"
          aria-label="Drag to reorder"
          disabled={busy}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7 opacity-90 shadow-lg"
              disabled={busy}
              aria-label="Remove image"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this photo?</AlertDialogTitle>
              <AlertDialogDescription>This photo will be removed from the property. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onDelete}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {isCover ? (
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Cover
        </span>
      ) : null}
    </div>
  );
}

export type PropertyPhotosManageGridProps = {
  manager: PropertyPhotoManager;
  size?: "sheet" | "compact";
  className?: string;
};

export function PropertyPhotosManageGrid({ manager, size = "sheet", className }: PropertyPhotosManageGridProps) {
  const {
    imageUrls,
    busy,
    dragOver,
    inputRef,
    uploadLabel,
    propertyImageAccept,
    openPicker,
    handleInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleDelete,
  } = manager;

  const isCompact = size === "compact";

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={propertyImageAccept}
        multiple
        className="hidden"
        aria-label="Upload property photos"
        onChange={handleInputChange}
      />

      {imageUrls.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openPicker();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openPicker}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-muted-foreground transition-colors",
            isCompact ? "aspect-[16/9] max-h-[220px] p-4" : "min-h-[160px] p-6",
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/40",
          )}
        >
          <Upload className={cn("opacity-50", isCompact ? "h-10 w-10" : "h-12 w-12")} />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{uploadLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">Drag & drop or click to select multiple photos</p>
          </div>
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={imageUrls} strategy={rectSortingStrategy}>
            <div
              className={cn(
                isCompact ? "flex flex-wrap items-center gap-2" : "grid grid-cols-3 sm:grid-cols-4 gap-2",
                dragOver && "rounded-xl ring-2 ring-primary",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {imageUrls.map((url, i) => (
                <SortablePhotoTile
                  key={url}
                  url={url}
                  index={i}
                  isCover={i === 0}
                  busy={busy}
                  size={size}
                  onDelete={() => handleDelete(i)}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "shrink-0 gap-2 rounded-xl border-dashed",
                  isCompact
                    ? "h-[100px] w-[140px] sm:h-[110px] sm:w-[160px]"
                    : "col-span-1 aspect-square h-auto w-full min-h-[80px]",
                )}
                disabled={busy}
                onClick={openPicker}
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">{uploadLabel}</span>
              </Button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {imageUrls.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          First photo is the cover on property cards and the large tile in the mosaic. Drag to reorder.
        </p>
      ) : null}
    </div>
  );
}
