import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface Call {
  id: string;
  user_id: string;
  contact_id: string | null;
  contact_name: string | null;
  call_date: string;
  duration_minutes: number | null;
  notes: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallInsert {
  contact_id?: string | null;
  contact_name?: string | null;
  call_date?: string;
  duration_minutes?: number | null;
  notes?: string | null;
  outcome?: string | null;
}

export interface CallUpdate {
  id: string;
  contact_id?: string | null;
  contact_name?: string | null;
  call_date?: string;
  duration_minutes?: number | null;
  notes?: string | null;
  outcome?: string | null;
}

export function useCalls() {
  // Realtime subscription - calls table added via migration

  return useQuery({
    queryKey: ["calls"],
    queryFn: async () => {
      // Note: calls table added via migration, types will be available after refresh
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .order("call_date", { ascending: false });
      
      if (error) throw error;
      return data as Call[];
    },
  });
}

export function useCreateCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (call: CallInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("calls")
        .insert({ ...call, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useUpdateCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: CallUpdate) => {
      const { data, error } = await supabase
        .from("calls")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useDeleteCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calls")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}
