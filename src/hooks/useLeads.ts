import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { buildContactInsertFromLeadRow } from "@/lib/contactFromLeadImport";
import { applyClassificationDefaultsForNewContact } from "@/lib/leadCategoryService";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface Lead {
  id: string;
  user_id: string;
  contact_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  property_interest: string | null;
  budget_min: number | null;
  budget_max: number | null;
  timeline: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInsert {
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  status?: string | null;
  notes?: string | null;
  property_interest?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  timeline?: string | null;
  contact_id?: string | null;
}

export interface LeadUpdate extends Partial<LeadInsert> {
  id: string;
}

export function useLeads() {
  useRealtimeSubscription("leads" as any, [["leads"]]);

  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("leads" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lead: LeadInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await (supabase
        .from("leads" as any) as any)
        .insert({ ...lead, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate) => {
      const { data, error } = await (supabase
        .from("leads" as any) as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("leads" as any) as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

const BULK_INSERT_CHUNK = 80;
const CONTACT_INSERT_CONCURRENCY = 8;

export type BulkCreateLeadsInput = {
  rows: LeadInsert[];
  /** When true, inserts a `contacts` row per lead (same fields as inbound-lead webhook) and runs classification defaults. */
  createContacts: boolean;
};

export type BulkCreateLeadsResult = {
  inserted: number;
  contactsCreated: number;
  contactFailures: { name: string; message: string }[];
  /** Set when contact insert succeeded but updating leads.contact_id failed */
  leadLinkFailures: { name: string; message: string }[];
};

type LeadChunkRow = LeadInsert & { user_id: string };

function stripUserId(row: LeadChunkRow): LeadInsert {
  const { user_id: _uid, ...rest } = row;
  return rest;
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += limit) {
    await Promise.all(items.slice(i, i + limit).map(fn));
  }
}

export function useBulkCreateLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rows, createContacts }: BulkCreateLeadsInput): Promise<BulkCreateLeadsResult> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (rows.length === 0) {
        return { inserted: 0, contactsCreated: 0, contactFailures: [], leadLinkFailures: [] };
      }

      let inserted = 0;
      const contactFailures: { name: string; message: string }[] = [];
      const leadLinkFailures: { name: string; message: string }[] = [];
      let contactsCreated = 0;

      for (let i = 0; i < rows.length; i += BULK_INSERT_CHUNK) {
        const slice: LeadChunkRow[] = rows.slice(i, i + BULK_INSERT_CHUNK).map((r) => ({
          ...r,
          user_id: user.id,
          source: r.source?.trim() ? r.source : "csv_import",
          status: r.status?.trim() || "new",
        }));

        const { data: insertedLeads, error } = await (supabase.from("leads" as any) as any)
          .insert(slice)
          .select("id");
        if (error) throw error;
        inserted += insertedLeads?.length ?? slice.length;

        if (!createContacts) continue;

        const leadIds = (insertedLeads ?? []).map((r: { id: string }) => r.id);
        if (leadIds.length !== slice.length) {
          throw new Error("Lead insert returned an unexpected number of rows");
        }

        const withLeadIds = slice.map((row, idx) => ({ row, leadId: leadIds[idx]! }));

        await mapPool(withLeadIds, CONTACT_INSERT_CONCURRENCY, async ({ row, leadId }) => {
          const payload = buildContactInsertFromLeadRow(stripUserId(row), user.id);
          const { data: cRow, error: cErr } = await supabase
            .from("contacts")
            .insert(payload as never)
            .select("id")
            .single();
          if (cErr) {
            contactFailures.push({ name: row.name, message: cErr.message });
            return;
          }
          if (!cRow?.id) return;
          try {
            await applyClassificationDefaultsForNewContact(supabase as SupabaseClient<Database>, cRow.id);
          } catch {
            /* DB without classification columns or RLS */
          }
          contactsCreated += 1;
          const { error: linkErr } = await supabase
            .from("leads")
            .update({ contact_id: cRow.id })
            .eq("id", leadId);
          if (linkErr) {
            leadLinkFailures.push({
              name: row.name,
              message: linkErr.message,
            });
          }
        });
      }

      return { inserted, contactsCreated, contactFailures, leadLinkFailures };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (variables.createContacts) {
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        queryClient.invalidateQueries({ queryKey: ["contact_addresses"] });
        queryClient.invalidateQueries({ queryKey: ["nurture_sequence_enrollments"] });
      }
    },
  });
}
