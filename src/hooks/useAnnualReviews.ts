import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AnnualReviewRow = Database["public"]["Tables"]["annual_reviews"]["Row"];
type AnnualReviewUpdate = Database["public"]["Tables"]["annual_reviews"]["Update"];
type PrepRow = Database["public"]["Tables"]["review_prep_checklist"]["Row"];
type CommunityEventRow = Database["public"]["Tables"]["community_events"]["Row"];
type CommunityEventInsert = Database["public"]["Tables"]["community_events"]["Insert"];
type EventInviteRow = Database["public"]["Tables"]["event_invites"]["Row"];

export type EventInviteWithContact = EventInviteRow & {
  contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
  } | null;
};

export type ContactPickerRow = Pick<
  Database["public"]["Tables"]["contacts"]["Row"],
  "id" | "first_name" | "last_name" | "name" | "email"
>;

export type AnnualReviewWithRelations = AnnualReviewRow & {
  contact: { first_name: string | null; last_name: string | null } | null;
  review_prep_checklist: PrepRow[] | null;
};

export function useAnnualReviews(year: number) {
  return useQuery({
    queryKey: ["annual-reviews", year],
    queryFn: async (): Promise<AnnualReviewWithRelations[]> => {
      const { data, error } = await supabase
        .from("annual_reviews")
        .select(
          `
          *,
          contact:contacts (first_name, last_name),
          review_prep_checklist (id, item, is_complete, completed_at, created_at)
        `
        )
        .eq("year", year)
        .order("scheduled_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      const rows = (data ?? []) as AnnualReviewWithRelations[];
      return rows.map((r) => ({
        ...r,
        review_prep_checklist: [...(r.review_prep_checklist ?? [])].sort((a, b) =>
          a.item.localeCompare(b.item)
        ),
      }));
    },
  });
}

export function useSeedJanuaryAnnualReviews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, max }: { year: number; max?: number }) => {
      const { data, error } = await supabase.rpc("seed_january_annual_reviews", {
        p_year: year,
        p_max: max ?? 20,
      });
      if (error) throw error;
      return data as { year?: number; reviews_created?: number; timestamp?: string };
    },
    onSuccess: (_, { year }) => {
      queryClient.invalidateQueries({ queryKey: ["annual-reviews", year] });
    },
  });
}

export function useUpdateAnnualReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AnnualReviewUpdate }) => {
      const { data, error } = await supabase
        .from("annual_reviews")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      if (row?.year != null) {
        queryClient.invalidateQueries({ queryKey: ["annual-reviews", row.year] });
      }
    },
  });
}

export function useTogglePrepChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      isComplete,
      reviewYear,
    }: {
      id: string;
      isComplete: boolean;
      reviewYear: number;
    }) => {
      const { data, error } = await supabase
        .from("review_prep_checklist")
        .update({
          is_complete: isComplete,
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return { row: data, reviewYear };
    },
    onSuccess: ({ reviewYear }) => {
      queryClient.invalidateQueries({ queryKey: ["annual-reviews", reviewYear] });
    },
  });
}

export function useCommunityEvents() {
  return useQuery({
    queryKey: ["community-events"],
    queryFn: async (): Promise<CommunityEventRow[]> => {
      const { data, error } = await supabase
        .from("community_events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContactsForEventInvites() {
  return useQuery({
    queryKey: ["contacts-event-invite-picker"],
    queryFn: async (): Promise<ContactPickerRow[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, name, email")
        .order("last_name", { ascending: true, nullsFirst: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useEventInvites(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-invites", eventId],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<EventInviteWithContact[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("event_invites")
        .select(
          `
          *,
          contact:contacts (id, first_name, last_name, name)
        `
        )
        .eq("event_id", eventId)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventInviteWithContact[];
    },
  });
}

export function useAddEventInvites() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, contactIds }: { eventId: string; contactIds: string[] }) => {
      if (contactIds.length === 0) return;
      const rows = contactIds.map((contact_id) => ({
        event_id: eventId,
        contact_id,
        rsvp_status: "invited" as const,
      }));
      const { error } = await supabase.from("event_invites").upsert(rows, {
        onConflict: "event_id,contact_id",
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-invites", eventId] });
    },
  });
}

export function useUpdateEventInviteRsvp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inviteId,
      eventId,
      rsvp_status,
    }: {
      inviteId: string;
      eventId: string;
      rsvp_status: string;
    }) => {
      const responded =
        rsvp_status !== "invited" ? new Date().toISOString() : null;
      const { error } = await supabase
        .from("event_invites")
        .update({ rsvp_status, responded_at: responded })
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-invites", eventId] });
    },
  });
}

export function useRemoveEventInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId, eventId }: { inviteId: string; eventId: string }) => {
      const { error } = await supabase.from("event_invites").delete().eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-invites", eventId] });
    },
  });
}

export function useCreateCommunityEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CommunityEventInsert, "user_id">) => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Not authenticated");

      const eventDate = payload.event_date;
      const d = new Date(eventDate + "T12:00:00");
      const month = d.getMonth() + 1;
      const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
      const year = d.getFullYear();

      const { data, error } = await supabase
        .from("community_events")
        .insert({
          ...payload,
          user_id: authData.user.id,
          year: payload.year ?? year,
          quarter: payload.quarter ?? quarter,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-events"] });
    },
  });
}
