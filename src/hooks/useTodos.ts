import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ["todos"];

export function useTodos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Todo[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Todo[];
    },
    enabled: Boolean(user),
  });
}

export function useAddTodo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (title: string): Promise<Todo> => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("todos")
        .select("sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sort_order = (existing?.sort_order ?? -1) + 1;
      const { data, error } = await supabase
        .from("todos")
        .insert({ user_id: user.id, title: title.trim(), sort_order })
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      completed,
      sort_order,
    }: {
      id: string;
      title?: string;
      completed?: boolean;
      sort_order?: number;
    }): Promise<Todo> => {
      const updates: Partial<{ title: string; completed: boolean; sort_order: number }> = {};
      if (title !== undefined) updates.title = title;
      if (completed !== undefined) updates.completed = completed;
      if (sort_order !== undefined) updates.sort_order = sort_order;
      if (Object.keys(updates).length === 0) throw new Error("No updates");

      const { data, error } = await supabase
        .from("todos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
