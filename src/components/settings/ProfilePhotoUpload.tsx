import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUpsertUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

const BUCKET = "user-avatars";
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type ProfilePhotoUploadProps = {
  displayName: string;
  avatarUrl: string | null;
  disabled?: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function ProfilePhotoUpload({ displayName, avatarUrl, disabled }: ProfilePhotoUploadProps) {
  const { user } = useAuth();
  const upsertProfile = useUpsertUserProfile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use JPEG, PNG, or WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be under 2 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      await upsertProfile.mutateAsync({ avatar_url: publicUrl });
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!user || !avatarUrl) return;
    setUploading(true);
    try {
      const folder = `${user.id}/`;
      const { data: files } = await supabase.storage.from(BUCKET).list(user.id);
      if (files?.length) {
        await supabase.storage.from(BUCKET).remove(files.map((f) => `${folder}${f.name}`));
      }
      await upsertProfile.mutateAsync({ avatar_url: null });
      toast.success("Profile photo removed");
    } catch {
      toast.error("Could not remove photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16 border border-border">
        <AvatarImage src={avatarUrl ?? undefined} alt={displayName || "Profile"} />
        <AvatarFallback className="text-sm font-medium">{initials(displayName)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload photo"}
        </Button>
        {avatarUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            disabled={disabled || uploading}
            onClick={() => void handleRemove()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
