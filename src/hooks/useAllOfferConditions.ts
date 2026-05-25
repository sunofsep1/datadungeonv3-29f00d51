import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import type { OfferCondition } from "@/lib/offerConditions";

export function useAllOfferConditions() {
  return useQuery({
    queryKey: ["all_offer_conditions"],
    queryFn: async (): Promise<OfferCondition[]> => {
      const { data, error } = await supabase
        .from("offer_conditions")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as OfferCondition[];
    },
  });
}
