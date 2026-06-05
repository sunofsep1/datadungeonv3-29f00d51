import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { usePropertyPhotoManager } from "@/hooks/usePropertyPhotoManager";
import { PropertyPhotosManageGrid } from "@/components/properties/PropertyPhotosManageGrid";
import {
  isAllowedPropertyImage,
  PROPERTY_IMAGE_ACCEPT,
  uploadPropertyImageBatch,
  type PropertyImageBatchResult,
} from "@/lib/propertyImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type PropertyImagesGalleryProps = {
  propertyId: string;
  images: string[];
  compact?: boolean;
  className?: string;
};

/** Compact photo manager for property add/edit dialog. */
export function PropertyImagesGallery({
  propertyId,
  images,
  compact = true,
  className,
}: PropertyImagesGalleryProps) {
  const manager = usePropertyPhotoManager(propertyId, images);

  return <PropertyPhotosManageGrid manager={manager} size={compact ? "compact" : "sheet"} className={className} />;
}

/** Pick photos before a property record exists (upload after save). */
export type PropertyImagesPendingPickerProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  className?: string;
};

export function PropertyImagesPendingPicker({
  files,
  onFilesChange,
  className,
}: PropertyImagesPendingPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(isAllowedPropertyImage);
    if (valid.length === 0) return;
    onFilesChange([...files, ...valid]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={PROPERTY_IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(Array.from(e.dataTransfer.files ?? []));
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/40",
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Add photos for this property</p>
        <p className="text-xs text-muted-foreground">Select or drop multiple images — uploaded when you save</p>
      </div>
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => {
            const preview = URL.createObjectURL(file);
            return (
              <div key={`${file.name}-${i}`} className="relative h-20 w-28 overflow-hidden rounded-lg border border-border">
                <img src={preview} alt="" className="h-full w-full object-cover" onLoad={() => URL.revokeObjectURL(preview)} />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-black/80"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export async function uploadPendingPropertyImages(
  propertyId: string,
  userId: string,
  files: File[],
): Promise<PropertyImageBatchResult> {
  return uploadPropertyImageBatch(supabase, userId, propertyId, files);
}
