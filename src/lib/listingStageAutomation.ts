import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget: when a listing's pipeline stage changes, optional SMS/email rules run (Edge Function).
 */
export async function invokeListingStageAutomation(
  listingId: string,
  previousStage: string | null | undefined,
  newStage: string | null | undefined,
): Promise<void> {
  if (!listingId || !newStage) return;
  if (previousStage != null && previousStage === newStage) return;

  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const url = `${base}/functions/v1/listing-stage-automation`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listing_id: listingId,
        new_stage: newStage,
        previous_stage: previousStage ?? null,
      }),
    });
  } catch {
    /* non-blocking */
  }
}
