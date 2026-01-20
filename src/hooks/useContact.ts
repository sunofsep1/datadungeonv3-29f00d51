import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "./useContacts";

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      if (!id) throw new Error("No contact ID provided");
      
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error("Contact not found");
      return data as Contact & {
        story?: string | null;
        pipeline_stage?: string | null;
        selling_intentions?: string | null;
        current_situation_notes?: string | null;
        pain_points?: string | null;
        pleasure_points?: string | null;
      };
    },
    enabled: !!id,
  });
}
