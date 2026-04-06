import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logContactActivity, invalidateContactInteractions } from "@/lib/contactActivityLog";
import { invalidateContactScoreQueries } from "@/lib/contactScoreQuery";

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
        .insert({ ...link, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      let addr = "Property";
      try {
        const { data: prop } = await (supabase as any)
          .from("properties")
          .select("address_line1, city, state, postcode")
          .eq("id", link.property_id)
          .maybeSingle();
        if (prop) {
          addr = [prop.address_line1, prop.city, prop.state, prop.postcode].filter(Boolean).join(", ") || addr;
        }
      } catch {
        /* ignore */
      }
      await logContactActivity({
        contactId: link.contact_id,
        subject: "Property linked",
        body: `${addr}${link.role ? ` · ${link.role}` : ""}`,
      });

      return data as ContactPropertyLink;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", d.property_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", d.contact_id] });
      qc.refetchQueries({ queryKey: ["contact", d.contact_id] });
      qc.refetchQueries({ queryKey: ["property", d.property_id] });
      invalidateContactInteractions(qc, d.contact_id);
      invalidateContactScoreQueries(qc);
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
      let summary = "Property unlinked";
      try {
        const { data: row } = await (supabase as any)
          .from("contact_property_links")
          .select("role, properties(address_line1, city, state, postcode)")
          .eq("id", id)
          .maybeSingle();
        const p = row?.properties;
        if (p) {
          summary = [p.address_line1, p.city, p.state, p.postcode].filter(Boolean).join(", ") || summary;
          if (row.role) summary += ` · ${row.role}`;
        }
      } catch {
        /* ignore */
      }

      const { error } = await (supabase as any)
        .from("contact_property_links")
        .delete()
        .eq("id", id);
      if (error) throw error;

      await logContactActivity({
        contactId: contact_id,
        subject: "Property unlinked",
        body: summary,
      });

      return { property_id, contact_id };
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", v.property_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", v.contact_id] });
      invalidateContactInteractions(qc, v.contact_id);
      invalidateContactScoreQueries(qc);
    },
  });
}
