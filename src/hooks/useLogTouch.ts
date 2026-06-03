import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateContactScoreQueries } from "@/lib/contactScoreQuery";
import { errorMessageFromUnknown } from "@/lib/utils";

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

      const touchDate = input.touch_date ?? new Date().toISOString();
      const notes = input.notes?.trim() ? input.notes.trim() : null;

      const { error: rpcError } = await supabase.rpc("log_touch_manual" as never, {
        p_contact_id: input.contact_id,
        p_touch_type: input.touch_type,
        p_notes: notes,
        p_touch_date: touchDate,
      } as never);

      if (!rpcError) return;

      const err = rpcError as { code?: string; message?: string };
      const msg = (err.message ?? "").toLowerCase();
      const fnMissing =
        err.code === "PGRST202" ||
        msg.includes("could not find the function") ||
        msg.includes("function public.log_touch_manual") ||
        /schema cache/i.test(msg);

      if (!fnMissing) {
        throw new Error(errorMessageFromUnknown(rpcError));
      }

      const { error } = await (supabase as any).from("touches").insert({
        contact_id: input.contact_id,
        touch_type: input.touch_type,
        notes,
        touch_date: touchDate,
        logged_by: userId,
        user_id: userId,
      });
      if (error) throw new Error(errorMessageFromUnknown(error));
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
