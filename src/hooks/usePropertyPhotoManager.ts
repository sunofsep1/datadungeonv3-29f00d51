import { useCallback, useRef, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useToast } from "@/hooks/use-toast";
import { useUpdateProperty } from "@/hooks/useProperties";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  bucketNotFoundHint,
  isAllowedPropertyImage,
  PROPERTY_IMAGE_ACCEPT,
  uploadPropertyImageBatch,
} from "@/lib/propertyImageUpload";

export function usePropertyPhotoManager(propertyId: string, images: string[]) {
  const { user } = useAuth();
  const { toast } = useToast();
  const updateProperty = useUpdateProperty();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const imageUrls = images;
  const busy = uploading || updateProperty.isPending;

  const persistImages = useCallback(
    async (next: string[], toastMessage?: string) => {
      await updateProperty.mutateAsync({ id: propertyId, images: next });
      if (toastMessage) toast({ title: toastMessage });
    },
    [propertyId, toast, updateProperty],
  );

  const uploadFiles = async (rawFiles: File[]) => {
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    const files = rawFiles.filter(isAllowedPropertyImage);
    const skipped = rawFiles.length - files.length;
    if (files.length === 0) {
      toast({
        title: "No valid images",
        description: "Choose JPEG, PNG, WebP, or GIF files.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    try {
      const { urls, failed } = await uploadPropertyImageBatch(supabase, user.id, propertyId, files);
      setUploadProgress({ done: files.length, total: files.length });

      if (urls.length > 0) {
        const merged = [...imageUrls, ...urls];
        await persistImages(
          merged,
          urls.length === 1 ? "Photo added" : `${urls.length} photos added`,
        );
      }

      if (failed.length > 0) {
        const hint = bucketNotFoundHint(failed[0]?.message ?? "");
        toast({
          title: urls.length > 0 ? "Some uploads failed" : "Upload failed",
          description: `${failed.map((f) => f.name).join(", ")}${hint}`,
          variant: "destructive",
        });
      }
      if (skipped > 0) {
        toast({
          title: "Some files skipped",
          description: `${skipped} file(s) were not images.`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not upload images";
      toast({ title: "Upload failed", description: msg + bucketNotFoundHint(msg), variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) void uploadFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) void uploadFiles(files);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = imageUrls.indexOf(active.id as string);
    const newIndex = imageUrls.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    void persistImages(arrayMove(imageUrls, oldIndex, newIndex));
  };

  const handleDelete = (index: number) => {
    const next = imageUrls.filter((_, i) => i !== index);
    void persistImages(next, "Photo removed");
  };

  const openPicker = () => inputRef.current?.click();

  const uploadLabel =
    uploadProgress && uploadProgress.total > 1
      ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…`
      : uploading
        ? "Uploading…"
        : "Upload photos";

  return {
    imageUrls,
    busy,
    dragOver,
    inputRef,
    uploadLabel,
    propertyImageAccept: PROPERTY_IMAGE_ACCEPT,
    openPicker,
    handleInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleDelete,
    uploadFiles,
  };
}

export type PropertyPhotoManager = ReturnType<typeof usePropertyPhotoManager>;
