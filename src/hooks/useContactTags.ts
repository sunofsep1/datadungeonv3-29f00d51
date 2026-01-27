import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export type ContactTagInsert = TablesInsert<"contact_tags">;

export function useAddContactTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: ContactTagInsert) => {
      const { data, error } = await supabase
        .from("contact_tags")
        .insert(link)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", d.contact_id] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useRemoveContactTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contact_id,
      tag_id,
    }: {
      contact_id: string;
      tag_id: string;
    }) => {
      const { error } = await supabase
        .from("contact_tags")
        .delete()
        .eq("contact_id", contact_id)
        .eq("tag_id", tag_id);
      if (error) throw error;
      return { contact_id, tag_id };
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
