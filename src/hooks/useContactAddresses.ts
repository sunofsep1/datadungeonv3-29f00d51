import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContactAddress {
  id: string;
  contact_id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  address_type: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactAddressInsert {
  contact_id: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  address_type?: string | null;
  is_primary?: boolean;
}

export interface ContactAddressUpdate extends Partial<ContactAddressInsert> {
  id: string;
}

export function useContactAddresses(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact_addresses", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await (supabase as any)
        .from("contact_addresses")
        .select("*")
        .eq("contact_id", contactId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactAddress[];
    },
    enabled: !!contactId,
  });
}

export function useAddContactAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ContactAddressInsert) => {
      const { data, error } = await (supabase as any)
        .from("contact_addresses")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as ContactAddress;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["contact_addresses", d.contact_id] });
    },
  });
}

export function useUpdateContactAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contact_id, ...updates }: ContactAddressUpdate & { contact_id: string }) => {
      const { data, error } = await (supabase as any)
        .from("contact_addresses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ContactAddress;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["contact_addresses", d.contact_id] });
    },
  });
}

export function useDeleteContactAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contact_id }: { id: string; contact_id: string }) => {
      const { error } = await (supabase as any)
        .from("contact_addresses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { contact_id };
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["contact_addresses", v.contact_id] });
    },
  });
}
