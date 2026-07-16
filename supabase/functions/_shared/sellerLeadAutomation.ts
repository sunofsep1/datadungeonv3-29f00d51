/**
 * Seller-lead speed-to-lead automation (Task 6 of the lead-gen funnel).
 *
 * Fires when the `inbound-lead` webhook creates a contact classified as a
 * seller lead from a Meta source (source starts with `meta_`). Three actions,
 * matching Greg's chosen behaviour in docs/LEAD_GEN_FUNNEL_BRIEF.md §Task 6:
 *
 *   1. Alert Greg instantly — SMS to AGENT_ALERT_MOBILE via Mobile Message.
 *   2. Draft the lead reply for one-tap approval — a `seller_lead_draft_reply`
 *      notification carrying the pre-written SMS text. NOT auto-sent; Greg
 *      approves it top of the CRM notifications feed (one-tap Send reuses send-sms).
 *   3. Nurture enrol for timeline > 3 months — insert a nurture enrollment.
 *
 * This runs best-effort: any failure here must NOT fail the lead/contact insert.
 * SMS provider is Mobile Message (reuse _shared/smsCore.ts); Twilio is not used here.
 */
import {
  mobileMessageCredsFromEnv,
  postMobileMessageBatch,
  toE164Australia,
} from "./smsCore.ts";

// Minimal shape of the Supabase service-role client we rely on. Kept loose on
// purpose — the edge function passes its `createClient(...)` instance.
// deno-lint-ignore no-explicit-any
type ServiceClient = any;

export type SellerLeadContext = {
  ownerUserId: string;
  contactId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null; // subject property (property_interest)
  timeline: string | null;
  source: string;
};

export type SellerLeadAutomationResult = {
  ran: boolean;
  agentAlertSms: "sent" | "failed" | "skipped";
  draftReply: "created" | "skipped";
  nurture: "enrolled" | "skipped" | "no_sequence";
  notes: string[];
};

/** True for seller leads that came from a Meta capture path. */
export function isMetaSellerLead(source: string, contactCategory: string): boolean {
  return contactCategory === "seller_lead" && /^meta_/i.test((source || "").trim());
}

/**
 * Leads whose timeline is longer than ~3 months (or non-committal) go into the
 * nurture drip. "Ready now" / "0-3 months" are hot — they get the immediate
 * reply, not the weekly drip.
 */
export function needsLongNurture(timeline: string | null | undefined): boolean {
  const t = (timeline || "").trim().toLowerCase();
  if (!t) return false;
  const hot = ["ready now", "0-3 months", "0–3 months", "immediately", "asap"];
  if (hot.some((h) => t.includes(h))) return false;
  return true; // 3-6 / 6-12 / just curious / anything else long-dated
}

function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim() || "there";
}

/** SMS to Greg's own phone the moment a lead lands. */
export function composeAgentAlertSms(ctx: SellerLeadContext): string {
  const name = fullName(ctx.firstName, ctx.lastName);
  const addr = ctx.address || "address not given";
  const timeline = ctx.timeline || "not specified";
  const phone = ctx.phone || "no phone";
  return `🔔 New appraisal lead: ${name}, ${addr}, timeline ${timeline}. Ph ${phone}. Approve reply in CRM.`;
}

/** The pre-written reply Greg approves and sends to the lead (one tap). */
export function composeLeadReplyDraft(ctx: SellerLeadContext, bookingLink: string | null): string {
  const first = ctx.firstName || "there";
  const addr = ctx.address || "your property";
  const base =
    `Hi ${first}, it's Greg from Queensland Sotheby's — thanks for requesting an appraisal on ${addr}. ` +
    `I can pop round this week; what suits?`;
  return bookingLink ? `${base} Or book here: ${bookingLink}` : base;
}

async function logOutboundSms(
  supabase: ServiceClient,
  row: {
    user_id: string;
    contact_id: string | null;
    to_phone: string;
    body: string;
    provider: string;
    provider_message_id: string | null;
    status: string;
    error: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("sms_outbound").insert({
      user_id: row.user_id,
      contact_id: row.contact_id,
      to_phone: row.to_phone,
      body_preview: row.body.slice(0, 200),
      provider: row.provider,
      provider_message_id: row.provider_message_id,
      status: row.status,
      error: row.error,
    });
  } catch (_e) {
    // audit-only; never block the automation
  }
}

async function createNotification(
  supabase: ServiceClient,
  args: {
    user_id: string;
    kind: string;
    priority: "urgent" | "action_required" | "info";
    title: string;
    body: string | null;
    action_url: string | null;
    action_label: string | null;
    related_contact_id: string | null;
    event_key: string | null;
  },
): Promise<void> {
  // Prefer the conflict-safe RPC (dedupes on event_key); fall back to insert.
  const { error } = await supabase.rpc("create_notification", {
    p_user_id: args.user_id,
    p_kind: args.kind,
    p_priority: args.priority,
    p_title: args.title,
    p_body: args.body,
    p_action_url: args.action_url,
    p_action_label: args.action_label,
    p_related_contact_id: args.related_contact_id,
    p_related_listing_id: null,
    p_entity_type: "contact",
    p_entity_id: args.related_contact_id,
    p_event_key: args.event_key,
  });
  if (error) {
    await supabase.from("notifications").insert({
      user_id: args.user_id,
      kind: args.kind,
      priority: args.priority,
      title: args.title,
      body: args.body,
      action_url: args.action_url,
      action_label: args.action_label,
      related_contact_id: args.related_contact_id,
      entity_type: "contact",
      entity_id: args.related_contact_id,
      event_key: args.event_key,
    });
  }
}

/** Kind used by the draft reply notification; the app reads this (one-tap send). */
export const SELLER_LEAD_DRAFT_REPLY_KIND = "seller_lead_draft_reply";
export const SELLER_LEAD_ALERT_KIND = "seller_lead_alert";

/** Action 4 — enrol the contact in a nurture sequence (best match). */
async function enrolNurture(
  supabase: ServiceClient,
  ctx: SellerLeadContext,
): Promise<SellerLeadAutomationResult["nurture"]> {
  // Find the owner's active sequences that have at least one step, preferring a
  // seller/valuation/nurture-named one.
  const { data: seqs } = await supabase
    .from("nurture_sequences")
    .select("id, name")
    .eq("user_id", ctx.ownerUserId)
    .eq("is_active", true);

  const sequences = (seqs || []) as Array<{ id: string; name: string | null }>;
  if (sequences.length === 0) return "no_sequence";

  const preferred =
    sequences.find((s) => /seller|vendor|valuation|apprais|nurtur/i.test(s.name || "")) ||
    sequences[0];

  // First step offset (days) drives when the first touch is due.
  const { data: steps } = await supabase
    .from("nurture_sequence_steps")
    .select("offset_days, sort_order")
    .eq("sequence_id", preferred.id)
    .order("sort_order", { ascending: true })
    .limit(1);

  const firstStep = (steps || [])[0] as { offset_days: number | null } | undefined;
  if (!firstStep) return "no_sequence";

  // Avoid a duplicate active enrollment on the same sequence.
  const { data: existing } = await supabase
    .from("nurture_sequence_enrollments")
    .select("id")
    .eq("contact_id", ctx.contactId)
    .eq("sequence_id", preferred.id)
    .is("completed_at", null)
    .limit(1);
  if ((existing || []).length > 0) return "skipped";

  const now = new Date();
  const next = new Date(now.getTime() + (firstStep.offset_days ?? 0) * 86_400_000);

  const { error } = await supabase.from("nurture_sequence_enrollments").insert({
    contact_id: ctx.contactId,
    sequence_id: preferred.id,
    user_id: ctx.ownerUserId,
    current_step_index: 0,
    started_at: now.toISOString(),
    next_step_at: next.toISOString(),
    pause_followup_cadence: false,
  });
  return error ? "no_sequence" : "enrolled";
}

/**
 * Orchestrator. Best-effort: swallows its own errors so the caller's 201 is
 * never jeopardised by automation problems.
 */
export async function runSellerLeadAutomation(
  supabase: ServiceClient,
  ctx: SellerLeadContext,
): Promise<SellerLeadAutomationResult> {
  const result: SellerLeadAutomationResult = {
    ran: true,
    agentAlertSms: "skipped",
    draftReply: "skipped",
    nurture: "skipped",
    notes: [],
  };

  const contactUrl = `/contacts/${ctx.contactId}`;
  const bookingLink = Deno.env.get("BOOKING_LINK") || null;

  // --- Action 1: instant SMS alert to the agent's own mobile -------------
  try {
    const agentMobile = Deno.env.get("AGENT_ALERT_MOBILE");
    const creds = mobileMessageCredsFromEnv();
    if (agentMobile && creds) {
      const to = toE164Australia(agentMobile);
      const msg = composeAgentAlertSms(ctx);
      const batch = await postMobileMessageBatch(creds, [{ to, message: msg }]);
      const first = (batch.data?.results as Array<{ message_id?: string; status?: string }> | undefined)?.[0];
      result.agentAlertSms = batch.ok ? "sent" : "failed";
      await logOutboundSms(supabase, {
        user_id: ctx.ownerUserId,
        contact_id: ctx.contactId,
        to_phone: to,
        body: msg,
        provider: "mobile_message",
        provider_message_id: first?.message_id ?? first?.status ?? null,
        status: batch.ok ? "sent" : "failed",
        error: batch.ok ? null : `Mobile Message HTTP ${batch.status}`,
      });
    } else {
      result.notes.push(
        !agentMobile ? "AGENT_ALERT_MOBILE not set" : "Mobile Message creds not set",
      );
    }
  } catch (e) {
    result.agentAlertSms = "failed";
    result.notes.push(`agent alert error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Also drop an urgent in-app notification so the lead is impossible to miss.
  try {
    await createNotification(supabase, {
      user_id: ctx.ownerUserId,
      kind: SELLER_LEAD_ALERT_KIND,
      priority: "urgent",
      title: `New appraisal lead: ${fullName(ctx.firstName, ctx.lastName)}`,
      body: `${ctx.address || "Address not given"} · timeline ${ctx.timeline || "n/a"} · ${ctx.phone || "no phone"}`,
      action_url: contactUrl,
      action_label: "View lead",
      related_contact_id: ctx.contactId,
      event_key: `${SELLER_LEAD_ALERT_KIND}:${ctx.contactId}`,
    });
  } catch (e) {
    result.notes.push(`alert notif error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // --- Action 2: draft the lead reply for one-tap approval (NOT sent) -----
  try {
    const draft = composeLeadReplyDraft(ctx, bookingLink);
    await createNotification(supabase, {
      user_id: ctx.ownerUserId,
      kind: SELLER_LEAD_DRAFT_REPLY_KIND,
      priority: "action_required",
      title: `Approve reply to ${fullName(ctx.firstName, ctx.lastName)}`,
      body: draft, // the app reads this as the pre-filled SMS body
      action_url: contactUrl,
      action_label: "Review & send",
      related_contact_id: ctx.contactId,
      event_key: `${SELLER_LEAD_DRAFT_REPLY_KIND}:${ctx.contactId}`,
    });
    result.draftReply = "created";
  } catch (e) {
    result.notes.push(`draft reply error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // --- Action 4: nurture enrol for timeline > 3 months --------------------
  try {
    if (needsLongNurture(ctx.timeline)) {
      result.nurture = await enrolNurture(supabase, ctx);
    }
  } catch (e) {
    result.notes.push(`nurture error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return result;
}
