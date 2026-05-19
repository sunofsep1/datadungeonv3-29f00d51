import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

export const CONTACT_RELATION_LABELS = [
  { value: "partner", label: "Partner / spouse" },
  { value: "family", label: "Family" },
  { value: "household", label: "Household member" },
  { value: "solicitor", label: "Solicitor" },
  { value: "accountant", label: "Accountant" },
  { value: "referrer", label: "Referrer" },
  { value: "agent", label: "Agent" },
  { value: "related", label: "Other" },
] as const;

export type ContactRelation = {
  id: string;
  contact_id: string;
  related_contact_id: string;
  relation_label: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  related?: {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export function useContactRelations(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact_relations", contactId ?? ""],
    queryFn: async () => {
      if (!contactId) return [] as ContactRelation[];
      const { data, error } = await supabase
        .from("contact_relations")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [] as ContactRelation[];
        throw new Error(supabaseErrorMessage(error));
      }
      const rows = (data ?? []) as ContactRelation[];
      if (rows.length === 0) return rows;
      const relatedIds = rows.map((r) => r.related_contact_id);
      const { data: contacts, error: cErr } = await supabase
        .from("contacts")
        .select("id, name, first_name, last_name, email, phone")
        .in("id", relatedIds);
      if (cErr) return rows;
      const byId = new Map((contacts ?? []).map((c) => [c.id, c]));
      return rows.map((r) => ({ ...r, related: byId.get(r.related_contact_id) ?? null }));
    },
    enabled: !!contactId,
  });
}

export function useAddContactRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contact_id: string;
      related_contact_id: string;
      relation_label: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("contact_relations")
        .insert({
          contact_id: input.contact_id,
          related_contact_id: input.related_contact_id,
          relation_label: input.relation_label,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ContactRelation;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["contact_relations", v.contact_id] });
    },
  });
}

export function useDeleteContactRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; contactId: string }) => {
      const { error } = await supabase.from("contact_relations").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["contact_relations", v.contactId] });
    },
  });
}
