import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

// Extended Appointment type to include google_event_id (recently added column)
export interface Appointment {
  id: string;
  user_id: string;
  contact_id: string | null;
  title: string;
  date: string;
  location: string | null;
  notes: string | null;
  status: string | null;
  type: string | null;
  google_event_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type AppointmentInsert = Partial<Omit<Appointment, "id" | "created_at" | "updated_at">> & {
  title: string;
  date: string;
  user_id: string;
  google_event_id?: string | null;
};
export type AppointmentUpdate = Partial<Omit<Appointment, "id" | "created_at" | "updated_at">> & { id: string };

export function useAppointments() {
  // Subscribe to realtime changes
  useRealtimeSubscription("appointments", [["appointments"]]);

  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("*")
        .order("date", { ascending: true });
      
      if (error) throw error;
      return data as Appointment[];
    },
  });
}

export function useAppointmentsByContact(contactId?: string | null, limit = 100) {
  return useQuery({
    queryKey: ["appointments", "contact", contactId ?? "", limit],
    queryFn: async () => {
      if (!contactId) return [] as Appointment[];
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("*")
        .eq("contact_id", contactId)
        .order("date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: Boolean(contactId),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (appointment: Omit<AppointmentInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await (supabase as any)
        .from("appointments")
        .insert({ ...appointment, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: AppointmentUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("appointments")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
