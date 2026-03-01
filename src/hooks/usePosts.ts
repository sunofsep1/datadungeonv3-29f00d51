import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  platform: string | null;
  status: string | null;
  scheduled_date: string | null;
  published_date: string | null;
  listing_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostInsert {
  title: string;
  content?: string | null;
  platform?: string | null;
  status?: string | null;
  scheduled_date?: string | null;
  published_date?: string | null;
  listing_id?: string | null;
}

export interface PostUpdate extends Partial<PostInsert> {
  id: string;
}

export function usePosts() {
  useRealtimeSubscription("posts" as any, [["posts"]]);

  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("posts" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) return (data ?? []) as Post[];
      const msg = (error?.message ?? "").toLowerCase();
      if (error?.code === "PGRST204" || msg.includes("relation") || msg.includes("posts") || msg.includes("does not exist") || String(error?.code) === "400") {
        return [] as Post[];
      }
      throw error;
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (post: PostInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await (supabase
        .from("posts" as any) as any)
        .insert({ ...post, user_id: user.id })
        .select()
        .single();
      if (error) {
        const msg = (error?.message ?? "").toLowerCase();
        if (error.code === "PGRST204" || String(error.code) === "400" || msg.includes("relation") || msg.includes("posts") || msg.includes("does not exist")) {
          throw new Error("Posts table is not set up. Run database migrations (npm run db:push) to enable posts.");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: PostUpdate) => {
      const { data, error } = await (supabase
        .from("posts" as any) as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        const msg = (error?.message ?? "").toLowerCase();
        if (error.code === "PGRST204" || String(error.code) === "400" || msg.includes("relation") || msg.includes("posts") || msg.includes("does not exist")) {
          throw new Error("Posts table is not set up. Run database migrations (npm run db:push) to enable posts.");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("posts" as any) as any)
        .delete()
        .eq("id", id);
      if (error) {
        const msg = (error?.message ?? "").toLowerCase();
        if (error.code === "PGRST204" || String(error.code) === "400" || msg.includes("relation") || msg.includes("posts") || msg.includes("does not exist")) {
          throw new Error("Posts table is not set up. Run database migrations (npm run db:push) to enable posts.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
