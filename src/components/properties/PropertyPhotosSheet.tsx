import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePropertyPhotoManager } from "@/hooks/usePropertyPhotoManager";
import { PropertyPhotosManageGrid } from "@/components/properties/PropertyPhotosManageGrid";
import { cn } from "@/lib/utils";

export type PropertyPhotosSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  images: string[];
  initialIndex?: number;
};

export function PropertyPhotosSheet({
  open,
  onOpenChange,
  propertyId,
  images,
  initialIndex = 0,
}: PropertyPhotosSheetProps) {
  const manager = usePropertyPhotoManager(propertyId, images);
  const [previewIndex, setPreviewIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      const max = Math.max(0, images.length - 1);
      setPreviewIndex(Math.min(Math.max(0, initialIndex), max));
    }
  }, [open, initialIndex, images.length]);

  const safePreviewIndex = images.length > 0 ? Math.min(previewIndex, images.length - 1) : 0;
  const previewUrl = images[safePreviewIndex];

  const goPreview = (delta: number) => {
    if (images.length <= 1) return;
    setPreviewIndex((i) => {
      const next = i + delta;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-[640px] overflow-y-auto">
        <SheetHeader className="pr-8">
          <SheetTitle>Photos ({images.length})</SheetTitle>
          <SheetDescription>Upload, reorder, and remove property photos.</SheetDescription>
        </SheetHeader>

        {previewUrl ? (
          <div className="relative mt-2 aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted">
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            {images.length > 1 ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 shadow-md"
                  onClick={() => goPreview(-1)}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 shadow-md"
                  onClick={() => goPreview(1)}
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {images.map((u, i) => (
                    <button
                      key={u + i}
                      type="button"
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === safePreviewIndex ? "w-5 bg-white" : "w-1.5 bg-white/50",
                      )}
                      onClick={() => setPreviewIndex(i)}
                      aria-label={`Preview photo ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex-1">
          <PropertyPhotosManageGrid manager={manager} size="sheet" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
