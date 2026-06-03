import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BuyerRequirementRecord } from "@/lib/buyerRequirementMatch";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

export type BuyerRequirement = BuyerRequirementRecord & {
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type BuyerRequirementInsert = {
  contact_id: string;
  action?: string;
  property_type?: string | null;
  category?: string | null;
  state?: string | null;
  suburbs?: string[];
  price_min?: number | null;
  price_max?: number | null;
  beds_min?: number | null;
  baths_min?: number | null;
  parking_min?: number | null;
  land_min_sqm?: number | null;
  land_max_sqm?: number | null;
  building_min_sqm?: number | null;
  building_max_sqm?: number | null;
  features_required?: string[];
  notes?: string | null;
};

export type BuyerRequirementUpdate = Partial<Omit<BuyerRequirementInsert, "contact_id">> & { id: string };

const QUERY_KEY = ["buyer_requirements"] as const;

export function useBuyerRequirements() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyer_requirements")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) {
        if (error.code === "42P01" || error.message?.includes("buyer_requirements")) {
          return [] as BuyerRequirement[];
        }
        throw error;
      }
      return (data ?? []) as BuyerRequirement[];
    },
  });
}

export function useContactBuyerRequirements(contactId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY, "contact", contactId ?? ""],
    queryFn: async () => {
      if (!contactId) return [] as BuyerRequirement[];
      const { data, error } = await supabase
        .from("buyer_requirements")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01" || error.message?.includes("buyer_requirements")) {
          return [] as BuyerRequirement[];
        }
        throw error;
      }
      return (data ?? []).map((r) => ({ ...r, _source: "saved" as const })) as BuyerRequirement[];
    },
    enabled: !!contactId,
  });
}

export function useCreateBuyerRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BuyerRequirementInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const row = {
        user_id: user.id,
        contact_id: payload.contact_id,
        action: payload.action ?? "buy",
        property_type: payload.property_type ?? null,
        category: payload.category ?? null,
        state: payload.state ?? "QLD",
        suburbs: payload.suburbs ?? [],
        price_min: payload.price_min ?? null,
        price_max: payload.price_max ?? null,
        beds_min: payload.beds_min ?? null,
        baths_min: payload.baths_min ?? null,
        parking_min: payload.parking_min ?? null,
        land_min_sqm: payload.land_min_sqm ?? null,
        land_max_sqm: payload.land_max_sqm ?? null,
        building_min_sqm: payload.building_min_sqm ?? null,
        building_max_sqm: payload.building_max_sqm ?? null,
        features_required: payload.features_required ?? [],
        notes: payload.notes ?? null,
      };

      const { data, error } = await supabase.from("buyer_requirements").insert(row).select().single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as BuyerRequirement;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
      void qc.invalidateQueries({ queryKey: [...QUERY_KEY, "contact", vars.contact_id] });
    },
  });
}

export function useUpdateBuyerRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: BuyerRequirementUpdate) => {
      const { data, error } = await supabase
        .from("buyer_requirements")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as BuyerRequirement;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
      void qc.invalidateQueries({ queryKey: [...QUERY_KEY, "contact", data.contact_id] });
    },
  });
}

export function useDeleteBuyerRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase.from("buyer_requirements").delete().eq("id", id);
      if (error) throw new Error(supabaseErrorMessage(error));
      return { contactId };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
      void qc.invalidateQueries({ queryKey: [...QUERY_KEY, "contact", data.contactId] });
    },
  });
}
