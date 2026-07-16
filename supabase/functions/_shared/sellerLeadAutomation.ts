/**
 * Seller-lead speed-to-lead automation (Task 6 of the lead-gen funnel).
 *
 * Fires when the `inbound-lead` webhook creates a contact classified as a
 * seller lead from a Meta source (source starts with `meta_`). Actions match
 * Greg's chosen behaviour in docs/LEAD_GEN_FUNNEL_BRIEF.md §Task 6:
 *
 *   1. Alert Greg instantly — SMS to AGENT_ALERT_MOBILE via Mobile Message.
 *   1b. Acknowledge the PROSPECT instantly — a short, branded ack SMS so they
 *       know Greg has their request (speed-to-lead). This is NOT the sales
 *       message; Greg still approves the real booking reply (Action 2).
 *   2. Draft the lead reply for one-tap approval — a `seller_lead_draft_reply`
 *      notification carrying the pre-written SMS text. NOT auto-sent; Greg
 *      approves it top of the CRM notifications feed (one-tap Send reuses send-sms).
 *   3. Nurture enrol for timeline > 3 months — insert a nurture enrollment.
 *
 * This runs best-effort: any failure here must NOT fail the lead/contact insert.
 * SMS provider is Mobile Message (reuse _shared/smsCore.ts); Twilio is not used here.
 */
import {
  appendCommercialOptOutIfMissing,
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
  email: string | null;
  address: string | null; // subject property (property_interest)
  timeline: string | null;
  source: string;
};

export type SellerLeadAutomationResult = {
  ran: boolean;
  agentAlertSms: "sent" | "failed" | "skipped";
  prospectAck: "sent" | "failed" | "skipped";
  prospectEmail: "sent" | "failed" | "skipped";
  draftReply: "created" | "skipped";
  nurture: "enrolled" | "skipped" | "no_sequence";
  notes: string[];
};

/**
 * Mobile Message returns per-message status "success" (not "sent") when it
 * accepts a message. The original code checked for "sent" only, so every
 * delivered alert was mislogged as "failed" with error "Mobile Message: success".
 * Treat the known-good statuses as delivered; fall back to HTTP ok when the
 * per-message status is absent.
 */
const MM_DELIVERED_STATUSES = new Set(["sent", "success", "queued", "delivered", "ok"]);
export function mmDelivered(batchOk: boolean, status: string | undefined): boolean {
  if (!batchOk) return false;
  if (!status) return true;
  return MM_DELIVERED_STATUSES.has(String(status).toLowerCase());
}

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

/** Short internal alert to Greg's own phone the moment a lead lands. */
export function composeAgentAlertSms(ctx: SellerLeadContext): string {
  const name = fullName(ctx.firstName, ctx.lastName);
  const addr = ctx.address || "address not given";
  const timeline = ctx.timeline || "not specified";
  const phone = ctx.phone || "no phone";
  return `New appraisal lead: ${name}, ${addr}. Timeline: ${timeline}. Call ${phone}.`;
}

/**
 * Instant light acknowledgement to the PROSPECT. Short + plain characters
 * (no em-dash/emoji) so it sends as a single GSM-7 SMS segment. STOP appended.
 */
export function composeProspectAckSms(ctx: SellerLeadContext): string {
  const first = ctx.firstName || "there";
  const base =
    `Hi ${first}, Greg Leigh from Sotheby's Redlands - got your appraisal request, I'll be in touch shortly.`;
  return appendCommercialOptOutIfMissing(base);
}

/**
 * Instant email acknowledgement to the PROSPECT. Same intent as the SMS ack:
 * confirm receipt and set the expectation that Greg will personally follow up.
 * Sender identified for Spam Act; reply-to opt-out line included.
 */
export function composeProspectAckEmail(ctx: SellerLeadContext): { subject: string; html: string } {
  const first = ctx.firstName || "there";
  const addr = ctx.address ? ` on <strong>${escapeHtml(ctx.address)}</strong>` : "";
  const subject = "Your Redlands property appraisal request — Greg Leigh";
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f6f2ea;padding:24px;font-family:Georgia,'Times New Roman',serif;color:#1a2233;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;">
    <tr><td style="background:#0e2140;padding:22px 28px;color:#fff;font-size:15px;letter-spacing:.02em;">Queensland Sotheby's International Realty</td></tr>
    <tr><td style="padding:28px;">
      <p style="margin:0 0 14px;font-size:16px;">Hi ${escapeHtml(first)},</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Thank you for requesting a free, no-obligation property appraisal${addr}. I've received your details and I'll personally be in touch very shortly to arrange a time that suits.</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">In the meantime, if you have any questions just reply to this email.</p>
      <p style="margin:22px 0 2px;font-size:15px;">Warm regards,</p>
      <p style="margin:0;font-size:15px;"><strong>Greg Leigh</strong><br>Local Redlands Property Specialist<br>Queensland Sotheby's International Realty</p>
      <p style="margin:22px 0 0;font-size:12px;color:#8a94a3;line-height:1.5;">You're receiving this because you requested an appraisal. If you'd prefer not to hear from me, just reply and let me know. Each office is independently owned and operated.</p>
    </td></tr>
  </table></body></html>`;
  return { subject, html };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The pre-written reply Greg approves and sends to the lead (one tap). */
export function composeLeadReplyDraft(ctx: SellerLeadContext, bookingLink: string | null): string {
  const first = ctx.firstName || "there";
  const addr = ctx.address || "your property";
  const base =
    `Hi ${first}, Greg Leigh from Sotheby's Redlands. Thanks re your appraisal on ${addr} - are you free for a quick call today or tomorrow?`;
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
    prospectAck: "skipped",
    prospectEmail: "skipped",
    draftReply: "skipped",
    nurture: "skipped",
    notes: [],
  };

  const contactUrl = `/contacts/${ctx.contactId}`;
  const bookingLink = Deno.env.get("BOOKING_LINK") || null;
  const creds = mobileMessageCredsFromEnv();

  // --- Action 1: instant SMS alert to the agent's own mobile -------------
  try {
    const agentMobile = Deno.env.get("AGENT_ALERT_MOBILE");
    if (agentMobile && creds) {
      const to = toE164Australia(agentMobile);
      const msg = composeAgentAlertSms(ctx);
      const batch = await postMobileMessageBatch(creds, [{ to, message: msg }]);
      const first = (batch.data?.results as Array<{ message_id?: string; status?: string; error?: string }> | undefined)?.[0];
      // Mobile Message accepts with status "success" — mmDelivered handles that.
      const isDelivered = mmDelivered(batch.ok, first?.status);
      result.agentAlertSms = isDelivered ? "sent" : "failed";

      let errorMsg: string | null = null;
      if (!isDelivered) {
        if (first?.error) {
          errorMsg = `Mobile Message: ${first.error}`;
        } else {
          errorMsg = `Mobile Message: ${first?.status ?? `HTTP ${batch.status}`}`;
        }
      }

      await logOutboundSms(supabase, {
        user_id: ctx.ownerUserId,
        contact_id: ctx.contactId,
        to_phone: to,
        body: msg,
        provider: "mobile_message",
        provider_message_id: first?.message_id ?? null,
        status: isDelivered ? "sent" : "failed",
        error: errorMsg,
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

  // --- Action 1b: instant light acknowledgement to the PROSPECT ----------
  // Speed-to-lead: they get a short branded ack the moment they submit. Greg
  // still approves the real booking reply (Action 2). Compliant: identifies
  // the sender + agency and appends "Reply STOP to opt out". Only fires when a
  // mobile is present and Mobile Message creds are configured.
  try {
    if (ctx.phone && creds) {
      const to = toE164Australia(ctx.phone);
      const msg = composeProspectAckSms(ctx);
      const batch = await postMobileMessageBatch(creds, [{ to, message: msg }]);
      const first = (batch.data?.results as Array<{ message_id?: string; status?: string; error?: string }> | undefined)?.[0];
      const isDelivered = mmDelivered(batch.ok, first?.status);
      result.prospectAck = isDelivered ? "sent" : "failed";

      let errorMsg: string | null = null;
      if (!isDelivered) {
        errorMsg = first?.error
          ? `Mobile Message: ${first.error}`
          : `Mobile Message: ${first?.status ?? `HTTP ${batch.status}`}`;
      }

      await logOutboundSms(supabase, {
        user_id: ctx.ownerUserId,
        contact_id: ctx.contactId,
        to_phone: to,
        body: msg,
        provider: "mobile_message",
        provider_message_id: first?.message_id ?? null,
        status: isDelivered ? "sent" : "failed",
        error: errorMsg,
      });
    } else {
      result.notes.push(!ctx.phone ? "prospect ack: no phone" : "prospect ack: Mobile Message creds not set");
    }
  } catch (e) {
    result.prospectAck = "failed";
    result.notes.push(`prospect ack error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // --- Action 1c: instant email acknowledgement to the PROSPECT ----------
  // Uses Resend directly (same provider as the send-email function) with the
  // existing RESEND_API_KEY / EMAIL_FROM secrets — no new provider needed.
  // Guarded: only when the prospect gave an email and Resend is configured.
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (ctx.email && resendKey) {
      const from = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";
      const { subject, html } = composeProspectAckEmail(ctx);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [ctx.email], subject, html }),
      });
      result.prospectEmail = res.ok ? "sent" : "failed";
      if (!res.ok) result.notes.push(`prospect email HTTP ${res.status}`);
      // Log to the contact timeline (interactions), matching send-email's behaviour.
      try {
        await supabase.from("interactions").insert({
          contact_id: ctx.contactId,
          user_id: ctx.ownerUserId,
          type: "email",
          channel: "email",
          subject,
          body: `Auto-acknowledgement emailed to ${ctx.email}`,
        });
      } catch (_e) {
        // audit-only; never block
      }
    } else {
      result.notes.push(!ctx.email ? "prospect email: no email" : "prospect email: RESEND_API_KEY not set");
    }
  } catch (e) {
    result.prospectEmail = "failed";
    result.notes.push(`prospect email error: ${e instanceof Error ? e.message : String(e)}`);
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
