import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PropertyGalleryProps {
  images: unknown;
  className?: string;
  altPrefix?: string;
}

export function PropertyGallery({
  images,
  className,
  altPrefix = "Property",
}: PropertyGalleryProps) {
  const urls = Array.isArray(images) ? (images as string[]) : [];
  const [index, setIndex] = useState(0);

  if (urls.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-white/10 bg-muted/30 text-muted-foreground",
          className
        )}
      >
        <div className="text-center py-12">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images</p>
        </div>
      </div>
    );
  }

  const prev = () => setIndex((i) => (i === 0 ? urls.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === urls.length - 1 ? 0 : i + 1));

  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-white/10", className)}>
      <div className="aspect-video bg-muted relative">
        <img
          src={urls[index]}
          alt={`${altPrefix} image ${index + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {urls.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80"
              onClick={prev}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80"
              onClick={next}
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {urls.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i === index ? "bg-primary" : "bg-white/50 hover:bg-white/70"
                  )}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
