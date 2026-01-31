import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Manual types for contact_property_links (spec: owner, seller, buyer, tenant, investor, agent, interested, other)
export interface ContactPropertyLink {
  id: string;
  contact_id: string;
  property_id: string;
  role: string;
  notes?: string | null;
  user_id?: string;
  created_at?: string;
  ownership_percentage?: number | null;
  acquisition_date?: string | null;
  holding_period_months?: number | null;
  purchase_price?: number | null;
  sale_price?: number | null;
}

export interface ContactPropertyLinkInsert {
  contact_id: string;
  property_id: string;
  role?: string;
  notes?: string | null;
  ownership_percentage?: number | null;
  acquisition_date?: string | null;
  holding_period_months?: number | null;
  purchase_price?: number | null;
  sale_price?: number | null;
}

export function useCreateContactPropertyLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: ContactPropertyLinkInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("contact_property_links")
        .insert(link)
        .select()
        .single();
      if (error) throw error;
      return data as ContactPropertyLink;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", d.property_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", d.contact_id] });
      qc.refetchQueries({ queryKey: ["contact", d.contact_id] });
      qc.refetchQueries({ queryKey: ["property", d.property_id] });
    },
  });
}

export function useDeleteContactPropertyLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      property_id,
      contact_id,
    }: {
      id: string;
      property_id: string;
      contact_id: string;
    }) => {
      const { error } = await (supabase as any)
        .from("contact_property_links")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { property_id, contact_id };
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", v.property_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", v.contact_id] });
    },
  });
}
