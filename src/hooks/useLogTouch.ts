import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateContactScoreQueries } from "@/lib/contactScoreQuery";

export type LogTouchInput = {
  contact_id: string;
  touch_type: string;
  notes?: string | null;
  /** ISO timestamp; defaults to now */
  touch_date?: string;
};

export function useLogTouch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LogTouchInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      let userId = user?.id ?? null;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id ?? null;
      }
      if (!userId) throw new Error("Not authenticated");

      const row = {
        contact_id: input.contact_id,
        touch_type: input.touch_type,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        touch_date: input.touch_date ?? new Date().toISOString(),
        logged_by: userId,
      };
      const { error } = await (supabase as any).from("touches").insert(row);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", vars.contact_id] });
      queryClient.invalidateQueries({ queryKey: ["daily-touch-summary"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-touch-summary"] });
      invalidateContactScoreQueries(queryClient);
    },
  });
}
