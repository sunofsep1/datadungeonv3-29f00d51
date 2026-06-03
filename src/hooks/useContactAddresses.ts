import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAddressLines, logContactActivity, invalidateContactInteractions } from "@/lib/contactActivityLog";

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
      // 403 = RLS blocks access; table may not exist in HubSpot-style schema
      if (error) {
        if (error.code === "PGRST301" || error.status === 403) return [];
        throw error;
      }
      return (data ?? []) as ContactAddress[];
    },
    enabled: !!contactId,
    retry: false,
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
      const row = data as ContactAddress;
      await logContactActivity({
        contactId: payload.contact_id,
        subject: "Address added",
        body: formatAddressLines(payload as Record<string, unknown>),
      });
      return row;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["contact_addresses", d.contact_id] });
      qc.invalidateQueries({ queryKey: ["contact", d.contact_id] });
      invalidateContactInteractions(qc, d.contact_id);
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
      await logContactActivity({
        contactId: contact_id,
        subject: "Address updated",
        body: formatAddressLines(updates as Record<string, unknown>),
      });
      return data as ContactAddress;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["contact_addresses", d.contact_id] });
      qc.invalidateQueries({ queryKey: ["contact", d.contact_id] });
      invalidateContactInteractions(qc, d.contact_id);
    },
  });
}

export function useDeleteContactAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contact_id }: { id: string; contact_id: string }) => {
      const { data: prev } = await (supabase as any)
        .from("contact_addresses")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      const { error } = await (supabase as any)
        .from("contact_addresses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await logContactActivity({
        contactId: contact_id,
        subject: "Address removed",
        body: prev ? formatAddressLines(prev as Record<string, unknown>) : undefined,
      });
      return { contact_id };
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["contact_addresses", v.contact_id] });
      qc.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      invalidateContactInteractions(qc, v.contact_id);
    },
  });
}
