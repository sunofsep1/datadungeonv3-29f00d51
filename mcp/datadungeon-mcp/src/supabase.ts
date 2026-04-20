import { createClient } from "@supabase/supabase-js";
import { assertUserAllowed, config } from "./config.js";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

export async function assertContactOwnership(contactId: string, userId: string) {
  assertUserAllowed(userId);
  const { data, error } = await supabase
    .from("contacts")
    .select("id, user_id, owner_id")
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Contact not found: ${contactId}`);

  const ownerCandidate = (data as { user_id?: string | null; owner_id?: string | null }).user_id
    ?? (data as { owner_id?: string | null }).owner_id
    ?? null;

  if (ownerCandidate && ownerCandidate !== userId) {
    throw new Error(`Contact ${contactId} does not belong to user ${userId}`);
  }
}

export async function assertWorkflowExistsForUser(workflowId: string, userId: string) {
  assertUserAllowed(userId);
  const { data, error } = await supabase
    .from("crm_workflows")
    .select("id, user_id, trigger_object, trigger_type, is_active")
    .eq("id", workflowId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Workflow not found for user: ${workflowId}`);

  const row = data as {
    trigger_object?: string | null;
    trigger_type?: string | null;
    is_active?: boolean | null;
  };
  if (row.trigger_object !== "contact") throw new Error("Workflow trigger_object must be 'contact'");
  if (row.trigger_type !== "manual") throw new Error("Workflow trigger_type must be 'manual'");
  if (!row.is_active) throw new Error("Workflow is not active");
}
