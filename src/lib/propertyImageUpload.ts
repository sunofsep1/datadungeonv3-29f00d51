import type { SupabaseClient } from "@supabase/supabase-js";

export const PROPERTY_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const PROPERTY_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function isAllowedPropertyImage(file: File): boolean {
  return (PROPERTY_IMAGE_MIME_TYPES as readonly string[]).includes(file.type);
}

export function propertyImageStoragePath(userId: string, propertyId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `${userId}/${propertyId}/${crypto.randomUUID()}.${ext}`;
}

export function bucketNotFoundHint(message: string): string {
  return /bucket not found|Bucket not found/i.test(message)
    ? " Create the storage bucket first: see docs/PROPERTY_IMAGES_BUCKET.md"
    : "";
}

export async function uploadPropertyImageToStorage(
  supabase: SupabaseClient,
  userId: string,
  propertyId: string,
  file: File,
): Promise<string> {
  if (!isAllowedPropertyImage(file)) {
    throw new Error(`"${file.name}" is not a supported image (JPEG, PNG, WebP, or GIF).`);
  }
  const path = propertyImageStoragePath(userId, propertyId, file.name);
  const { error } = await supabase.storage
    .from("property-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("property-images").getPublicUrl(path);
  return data.publicUrl;
}

export type PropertyImageBatchResult = {
  urls: string[];
  failed: Array<{ name: string; message: string }>;
};

/** Upload many files sequentially; collects successes and per-file failures. */
export async function uploadPropertyImageBatch(
  supabase: SupabaseClient,
  userId: string,
  propertyId: string,
  files: File[],
): Promise<PropertyImageBatchResult> {
  const urls: string[] = [];
  const failed: Array<{ name: string; message: string }> = [];
  for (const file of files) {
    try {
      urls.push(await uploadPropertyImageToStorage(supabase, userId, propertyId, file));
    } catch (err) {
      failed.push({
        name: file.name,
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }
  return { urls, failed };
}
