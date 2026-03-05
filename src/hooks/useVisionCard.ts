import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BUCKET = "vision-board";
const SIGNED_URL_EXPIRY = 60 * 60 * 24;

export interface VisionCardItem {
  id: string;
  title: string;
  color: string;
  target_date: string | null;
  image_url: string | null;
  image_path?: string | null;
  notes: string | null;
  status: string | null;
  sort_order: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

function parseStoragePathFromSignedUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url || typeof url !== "string") return null;
  const marker = `/object/sign/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const start = i + marker.length;
  const end = url.indexOf("?", start);
  const path = end === -1 ? url.slice(start) : url.slice(start, end);
  return path ? decodeURIComponent(path) : null;
}

export function useVisionCard(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vision-card", id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from("vision_board_items")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) return null;
      const row = data as VisionCardItem;

      const path = row.image_path ?? parseStoragePathFromSignedUrl(row.image_url, BUCKET);
      if (path) {
        const { data: urlData } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, SIGNED_URL_EXPIRY);
        return { ...row, image_url: urlData?.signedUrl ?? row.image_url };
      }
      return row;
    },
    enabled: Boolean(id && user),
  });
}

export function useUpdateVisionCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      notes,
      status,
      target_date,
      title,
      color,
    }: {
      id: string;
      notes?: string | null;
      status?: string | null;
      target_date?: string | null;
      title?: string;
      color?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (notes !== undefined) updates.notes = notes;
      if (status !== undefined) updates.status = status;
      if (target_date !== undefined) updates.target_date = target_date;
      if (title !== undefined) updates.title = title;
      if (color !== undefined) updates.color = color;

      let { data, error } = await supabase
        .from("vision_board_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error && String(error.code) === "400") {
        const baseUpdates: Record<string, unknown> = {};
        if (target_date !== undefined) baseUpdates.target_date = target_date;
        if (title !== undefined) baseUpdates.title = title;
        if (color !== undefined) baseUpdates.color = color;
        if (Object.keys(baseUpdates).length > 0) {
          const retry = await supabase
            .from("vision_board_items")
            .update(baseUpdates)
            .eq("id", id)
            .select()
            .single();
          if (!retry.error) return retry.data as VisionCardItem;
        }
      }
      if (error) throw error;
      return data as VisionCardItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vision-card", data.id] });
      queryClient.invalidateQueries({ queryKey: ["vision-board"] });
    },
  });
}
