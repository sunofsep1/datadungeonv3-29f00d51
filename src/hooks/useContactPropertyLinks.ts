import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export type ContactPropertyLinkInsert = TablesInsert<"contact_property_links">;

export function useCreateContactPropertyLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: ContactPropertyLinkInsert) => {
      const { data, error } = await supabase
        .from("contact_property_links")
        .insert(link)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", d.property_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", d.contact_id] });
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
      const { error } = await supabase
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
