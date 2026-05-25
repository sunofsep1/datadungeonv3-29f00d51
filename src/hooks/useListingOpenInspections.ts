import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import type { OfiOpenType } from "@/lib/ofiInspection";

export type ListingOpenInspection = {
  id: string;
  listing_id: string;
  user_id: string;
  open_type: string;
  starts_at: string;
  ends_at: string;
  check_in_token: string;
  created_at: string;
  updated_at: string;
};

export type InspectionAttendee = {
  id: string;
  inspection_id: string;
  contact_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  interest_level?: string | null;
  working_with_agent?: boolean | null;
  checked_in_at: string;
  created_at: string;
  contacts?: { id: string; name: string | null; first_name: string | null; last_name: string | null } | null;
};

export type ListingOpenInspectionWithAttendees = ListingOpenInspection & {
  attendees: InspectionAttendee[];
  attendeeCount: number;
};

async function syncListingInspectionKpis(listingId: string) {
  const { error } = await supabase.rpc("sync_listing_inspection_kpis", { p_listing_id: listingId });
  if (error && error.code !== "42883" && error.code !== "PGRST202") {
    console.warn("sync_listing_inspection_kpis:", error.message);
  }
}

export function useListingOpenInspections(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_open_inspections", listingId ?? ""],
    queryFn: async (): Promise<ListingOpenInspectionWithAttendees[]> => {
      if (!listingId) return [];
      const { data: inspections, error: inspErr } = await supabase
        .from("listing_open_inspections")
        .select("*")
        .eq("listing_id", listingId)
        .order("starts_at", { ascending: true });
      if (inspErr) {
        if (inspErr.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(inspErr));
      }
      const rows = (inspections ?? []) as ListingOpenInspection[];
      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      const { data: attendees, error: attErr } = await supabase
        .from("listing_inspection_attendees")
        .select("*, contacts(id, name, first_name, last_name)")
        .in("inspection_id", ids)
        .order("checked_in_at", { ascending: false });
      if (attErr) {
        if (attErr.code === "42P01") {
          return rows.map((r) => ({ ...r, attendees: [], attendeeCount: 0 }));
        }
        throw new Error(supabaseErrorMessage(attErr));
      }
      const byInspection = new Map<string, InspectionAttendee[]>();
      for (const a of (attendees ?? []) as InspectionAttendee[]) {
        const list = byInspection.get(a.inspection_id) ?? [];
        list.push(a);
        byInspection.set(a.inspection_id, list);
      }
      return rows.map((r) => {
        const list = byInspection.get(r.id) ?? [];
        return { ...r, attendees: list, attendeeCount: list.length };
      });
    },
    enabled: !!listingId,
  });
}

export function useUpcomingOpenInspections(limit = 8) {
  return useQuery({
    queryKey: ["upcoming_open_inspections", limit],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("listing_open_inspections")
        .select("id, starts_at, ends_at, open_type, listing_id, listings(id, address)")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(limit);
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as Array<{
        id: string;
        starts_at: string;
        ends_at: string;
        open_type: string;
        listing_id: string;
        listings: { id: string; address: string | null } | null;
      }>;
    },
  });
}

export function useCreateListingOpenInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      starts_at: string;
      ends_at: string;
      open_type?: OfiOpenType;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const token =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "")
          : `${Date.now()}${Math.random().toString(36).slice(2)}`;
      const { data, error } = await supabase
        .from("listing_open_inspections")
        .insert({
          listing_id: input.listing_id,
          user_id: user.id,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          open_type: input.open_type ?? "advertised",
          check_in_token: token,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      await syncListingInspectionKpis(input.listing_id);
      return data as ListingOpenInspection;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_open_inspections", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listing", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["upcoming_open_inspections"] });
    },
  });
}

export function useDeleteListingOpenInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; listingId: string }) => {
      const { error } = await supabase.from("listing_open_inspections").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
      await syncListingInspectionKpis(input.listingId);
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["listing_open_inspections", v.listingId] });
      void qc.invalidateQueries({ queryKey: ["listing", v.listingId] });
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["upcoming_open_inspections"] });
    },
  });
}

export function useAddInspectionAttendee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      inspection_id: string;
      listing_id: string;
      contact_id: string;
    }) => {
      const { data, error } = await supabase
        .from("listing_inspection_attendees")
        .insert({
          inspection_id: input.inspection_id,
          contact_id: input.contact_id,
          checked_in_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      await syncListingInspectionKpis(input.listing_id);
      return data as InspectionAttendee;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["listing_open_inspections", v.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listing_contact_links", v.listing_id] });
    },
  });
}
