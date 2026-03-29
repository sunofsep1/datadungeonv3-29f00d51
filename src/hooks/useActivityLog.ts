import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

// Define types locally since activity_log table was just created
export interface ActivityLogRow {
  id: string;
  user_id: string;
  contact_id: string | null;
  property_id: string | null;
  listing_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export type ActivityLogInsert = Omit<ActivityLogRow, "id" | "user_id" | "created_at" | "updated_at" | "occurred_at"> & {
  occurred_at?: string;
};

export function useActivityLog(filters: {
  contactId?: string | null;
  propertyId?: string | null;
  listingId?: string | null;
  limit?: number;
}) {
  const { contactId, propertyId, listingId, limit } = filters;
  const queryKey = ["activity_log", contactId ?? "", propertyId ?? "", listingId ?? "", limit ?? "all"];

  // Note: realtime subscription disabled until types regenerate
  // useRealtimeSubscription("activity_log", [queryKey]);

  const hasFilter = !!(contactId || propertyId || listingId);

  return useQuery({
    queryKey,
    queryFn: async () => {
      let q = (supabase as any)
        .from("activity_log")
        .select("*")
        .order("occurred_at", { ascending: false });

      if (contactId) q = q.eq("contact_id", contactId);
      if (propertyId) q = q.eq("property_id", propertyId);
      if (listingId) q = q.eq("listing_id", listingId);
      if (limit && limit > 0) q = q.limit(limit);

      const { data, error } = await q;
      if (error) throw error;
      return data as ActivityLogRow[];
    },
    enabled: hasFilter,
  });
}

export function useActivityLogByContact(contactId: string | null | undefined) {
  return useActivityLog({ contactId, limit: 120 });
}

export function useActivityLogByProperty(propertyId: string | null | undefined) {
  return useActivityLog({ propertyId });
}

export function useActivityLogByListing(listingId: string | null | undefined, limit = 120) {
  return useActivityLog({ listingId, limit });
}

/** User-scoped recent activity for dashboard feed */
export function useRecentActivityLog(limit = 20) {
  const queryKey = ["activity_log", "recent", String(limit)];

  // Note: realtime subscription disabled until types regenerate
  // useRealtimeSubscription("activity_log", [queryKey]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("activity_log")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLogRow[];
    },
  });
}

export function useCreateActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ActivityLogInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("activity_log")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as ActivityLogRow;
    },
    onSuccess: (row: ActivityLogRow) => {
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      if (row.contact_id) queryClient.invalidateQueries({ queryKey: ["contact", row.contact_id] });
      if (row.property_id) queryClient.invalidateQueries({ queryKey: ["properties", row.property_id] });
      if (row.listing_id) {
        queryClient.invalidateQueries({ queryKey: ["listings"] });
        queryClient.invalidateQueries({ queryKey: ["listing", row.listing_id] });
      }
    },
  });
}

export function useUpdateActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<ActivityLogRow> & { id: string }) => {
      const { id, ...payload } = input;
      const { data, error } = await (supabase as any)
        .from("activity_log")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ActivityLogRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    },
  });
}

export function useDeleteActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("activity_log").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    },
  });
}
