import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  due_at: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
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

function getNextDueIso(base: Date, recurrence: Todo["recurrence"]): string {
  const d = new Date(base);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export function useAddTodo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input:
        | string
        | {
            title: string;
            priority?: Todo["priority"];
            due_at?: string | null;
            recurrence?: Todo["recurrence"];
          }
    ): Promise<Todo> => {
      if (!user) throw new Error("Not authenticated");
      const title = typeof input === "string" ? input : input.title;
      const priority = typeof input === "string" ? "medium" : input.priority ?? "medium";
      const dueAt = typeof input === "string" ? null : input.due_at ?? null;
      const recurrence = typeof input === "string" ? "none" : input.recurrence ?? "none";
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
        .insert({
          user_id: user.id,
          title: title.trim(),
          sort_order,
          priority,
          due_at: dueAt,
          recurrence,
        })
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
      priority,
      due_at,
      recurrence,
      sort_order,
    }: {
      id: string;
      title?: string;
      completed?: boolean;
      priority?: Todo["priority"];
      due_at?: string | null;
      recurrence?: Todo["recurrence"];
      sort_order?: number;
    }): Promise<Todo> => {
      const updates: Partial<{
        title: string;
        completed: boolean;
        priority: Todo["priority"];
        due_at: string | null;
        recurrence: Todo["recurrence"];
        sort_order: number;
      }> = {};
      if (title !== undefined) updates.title = title;
      if (completed !== undefined) updates.completed = completed;
      if (priority !== undefined) updates.priority = priority;
      if (due_at !== undefined) updates.due_at = due_at;
      if (recurrence !== undefined) updates.recurrence = recurrence;
      if (sort_order !== undefined) updates.sort_order = sort_order;
      if (Object.keys(updates).length === 0) throw new Error("No updates");

      if (completed === true) {
        const { data: current } = await supabase
          .from("todos")
          .select("due_at, recurrence")
          .eq("id", id)
          .maybeSingle();
        const recur = (current?.recurrence ?? "none") as Todo["recurrence"];
        if (recur !== "none") {
          const baseDate = current?.due_at ? new Date(current.due_at) : new Date();
          updates.completed = false;
          updates.due_at = getNextDueIso(baseDate, recur);
        }
      }

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
