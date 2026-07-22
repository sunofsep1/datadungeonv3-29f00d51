import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * True when the contact is linked to at least one property flagged as an investment
 * (i.e. an absentee owner / landlord). Two small queries — a contact only has a handful
 * of linked properties, so no large `.in()` risk.
 */
export function useContactOwnsInvestment(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-owns-investment", contactId],
    enabled: Boolean(contactId),
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      if (!contactId) return false;
      const { data: links, error } = await supabase
        .from("contact_property_links")
        .select("property_id")
        .eq("contact_id", contactId);
      if (error) throw error;
      const ids = [...new Set((links ?? []).map((l: { property_id: string }) => l.property_id).filter(Boolean))];
      if (ids.length === 0) return false;
      const { data: inv, error: e2 } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            in: (k: string, v: string[]) => {
              eq: (k: string, v: string) => {
                limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
              };
            };
          };
        };
      })
        .from("properties")
        .select("id")
        .in("id", ids)
        .eq("ownership_type", "investment")
        .limit(1);
      if (e2) throw new Error(e2.message);
      return (inv ?? []).length > 0;
    },
  });
}
