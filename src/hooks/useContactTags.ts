import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logContactActivity, invalidateContactInteractions } from "@/lib/contactActivityLog";

// Manual types for contact_tags (not in auto-generated types)
export interface ContactTagInsert {
  contact_id: string;
  tag_id: string;
}

export function useAddContactTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: ContactTagInsert) => {
      const { data, error } = await (supabase as any)
        .from("contact_tags")
        .insert(link)
        .select()
        .single();
      if (error) throw error;
      let tagName: string | undefined;
      try {
        const { data: tag } = await (supabase as any)
          .from("tags")
          .select("name")
          .eq("id", link.tag_id)
          .maybeSingle();
        tagName = tag?.name;
      } catch {
        /* ignore */
      }
      await logContactActivity({
        contactId: link.contact_id,
        subject: "Tag added",
        body: tagName ? `Tag: ${tagName}` : undefined,
      });
      return data as { id?: string; contact_id: string; tag_id: string };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", d.contact_id] });
      qc.invalidateQueries({ queryKey: ["tags"] });
      invalidateContactInteractions(qc, d.contact_id);
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
      let tagName: string | undefined;
      try {
        const { data: tag } = await (supabase as any)
          .from("tags")
          .select("name")
          .eq("id", tag_id)
          .maybeSingle();
        tagName = tag?.name;
      } catch {
        /* ignore */
      }
      const { error } = await (supabase as any)
        .from("contact_tags")
        .delete()
        .eq("contact_id", contact_id)
        .eq("tag_id", tag_id);
      if (error) throw error;
      await logContactActivity({
        contactId: contact_id,
        subject: "Tag removed",
        body: tagName ? `Tag: ${tagName}` : undefined,
      });
      return { contact_id, tag_id };
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      qc.invalidateQueries({ queryKey: ["tags"] });
      invalidateContactInteractions(qc, v.contact_id);
    },
  });
}
