/**
 * Seller-lead speed-to-lead automation. Fires when inbound-lead creates a
 * contact classified as a seller lead from a Meta source (source starts meta_).
 * Best-effort: never fails the lead/contact insert. SMS via Mobile Message.
 */
import {
  appendCommercialOptOutIfMissing,
  mobileMessageCredsFromEnv,
  postMobileMessageBatch,
  toE164Australia,
} from "./smsCore.ts";

// deno-lint-ignore no-explicit-any
type ServiceClient = any;

export type SellerLeadContext = {
  ownerUserId: string;
  contactId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
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

const MM_DELIVERED_STATUSES = new Set(["sent", "success", "queued", "delivered", "ok"]);
export function mmDelivered(batchOk: boolean, status: string | undefined): boolean {
  if (!batchOk) return false;
  if (!status) return true;
  return MM_DELIVERED_STATUSES.has(String(status).toLowerCase());
}

export function isMetaSellerLead(source: string, contactCategory: string): boolean {
  return contactCategory === "seller_lead" && /^meta_/i.test((source || "").trim());
}

export function needsLongNurture(timeline: string | null | undefined): boolean {
  const t = (timeline || "").trim().toLowerCase();
  if (!t) return false;
  const hot = ["ready now", "0-3 months", "0–3 months", "immediately", "asap"];
  if (hot.some((h) => t.includes(h))) return false;
  return true;
}

function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim() || "there";
}

export function composeAgentAlertSms(ctx: SellerLeadContext): string {
  const name = fullName(ctx.firstName, ctx.lastName);
  const addr = ctx.address || "address not given";
  const timeline = ctx.timeline || "not specified";
  const phone = ctx.phone || "no phone";
  return `New appraisal lead: ${name}, ${addr}. Timeline: ${timeline}. Call ${phone}.`;
}

/** Greg's own mobile (last 9 digits). Self-tests to this number skip the STOP
 * footer — replying STOP from his own phone once unsubscribed him at the
 * provider and silently killed ALL his alert SMS. Real prospects always get
 * the compliant opt-out line. */
const AGENT_MOBILE_LAST9 = "466805992";

function isAgentOwnNumber(phone: string | null | undefined): boolean {
  const digits = (phone ?? "").replace(/\D+/g, "");
  return digits.length >= 9 && digits.endsWith(AGENT_MOBILE_LAST9);
}

export function composeProspectAckSms(ctx: SellerLeadContext): string {
  const first = ctx.firstName || "there";
  const base = `Hi ${first}, Greg Leigh from Sotheby's Redlands - got your appraisal request, I'll be in touch shortly.`;
  if (isAgentOwnNumber(ctx.phone)) return base; // self-test: no opt-out footer
  return appendCommercialOptOutIfMissing(base);
}

/** Typographic GREG LEIGH header on navy. No agency logo/lockup — QSIR withdrew
 * logo permission (Aug 2026); the agency name appears in plain text only. */
export function composeProspectAckEmail(ctx: SellerLeadContext): { subject: string; html: string } {
  const first = ctx.firstName || "there";
  const addr = ctx.address ? ` on <strong>${escapeHtml(ctx.address)}</strong>` : "";
  const subject = "Your Redlands property appraisal request — Greg Leigh";
  const header =
    `        <tr><td bgcolor="#0e2140" style="background:#0e2140;padding:38px 40px;text-align:center;">\n          <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-weight:600;font-size:30px;line-height:1.1;letter-spacing:.18em;color:#ffffff;">GREG&nbsp;LEIGH</div>\n          <div style="margin-top:6px;font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#c6b58a;font-family:Arial,Helvetica,sans-serif;">Redlands Coast Real Estate</div>\n        </td></tr>\n        <tr><td style="height:3px;line-height:3px;font-size:0;background:#b08d3f;">&nbsp;</td></tr>`;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&display=swap');</style></head>
<body style="margin:0;padding:0;background:#f3efe7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e8e1d4;">
${header}
        <tr><td style="padding:46px 48px 40px;font-family:Georgia,'Times New Roman',serif;color:#20242e;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#b08d3f;font-family:Arial,Helvetica,sans-serif;">Your Free Appraisal</p>
          <h1 style="margin:0 0 24px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-weight:600;font-size:33px;line-height:1.2;color:#0e2140;">Thank you, ${escapeHtml(first)}.</h1>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">I&#39;ve received your request for a free, no-obligation appraisal${addr}. I&#39;ll personally be in touch very shortly to arrange a time that suits &mdash; no call centres, just an honest read on your home from a local expert with more than 300 homes sold across Brisbane over the past nine years.</p>
          <p style="margin:0 0 26px;font-size:16px;line-height:1.75;">In the meantime, if there&#39;s anything you&#39;d like to ask, simply reply to this email.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 34px;"><tr>
            <td bgcolor="#b08d3f" style="border-radius:2px;">
              <a href="https://gregleighproperty.com.au/sales" rel="noopener" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:.04em;color:#0e2140;text-decoration:none;">See my recent sales &rarr;</a>
            </td>
          </tr></table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e1d4;"><tr><td style="padding-top:24px;">
            <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#0e2140;line-height:1.2;">Greg Leigh</div>
            <div style="margin-top:5px;font-size:13px;line-height:1.7;color:#6b6b6b;font-family:Arial,Helvetica,sans-serif;">Local Redlands Property Specialist<br>Queensland Sotheby&#39;s International Realty<br><a href="https://gregleighproperty.com.au" rel="noopener" style="color:#b08d3f;text-decoration:none;">gregleighproperty.com.au</a></div>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#f3efe7;padding:22px 40px;text-align:center;border-top:1px solid #e8e1d4;">
          <p style="margin:0;font-size:11px;line-height:1.7;color:#8a8a8a;font-family:Arial,Helvetica,sans-serif;">You&#39;re receiving this because you requested an appraisal at redlandshomevalue.com.au. Prefer not to hear from me? Just reply and let me know.<br>Each office is independently owned and operated.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { subject, html };
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function composeLeadReplyDraft(ctx: SellerLeadContext, bookingLink: string | null): string {
  const first = ctx.firstName || "there";
  const addr = ctx.address || "your property";
  const base = `Hi ${first}, Greg Leigh from Sotheby's Redlands. Thanks re your appraisal on ${addr} - are you free for a quick call today or tomorrow?`;
  return bookingLink ? `${base} Or book here: ${bookingLink}` : base;
}

async function logOutboundSms(supabase: ServiceClient, row: { user_id: string; contact_id: string | null; to_phone: string; body: string; provider: string; provider_message_id: string | null; status: string; error: string | null; }): Promise<void> {
  try {
    await supabase.from("sms_outbound").insert({
      user_id: row.user_id, contact_id: row.contact_id, to_phone: row.to_phone,
      body_preview: row.body.slice(0, 200), provider: row.provider,
      provider_message_id: row.provider_message_id, status: row.status, error: row.error,
    });
  } catch (_e) { /* audit-only */ }
}

async function createNotification(supabase: ServiceClient, args: { user_id: string; kind: string; priority: "urgent" | "action_required" | "info"; title: string; body: string | null; action_url: string | null; action_label: string | null; related_contact_id: string | null; event_key: string | null; }): Promise<void> {
  const { error } = await supabase.rpc("create_notification", {
    p_user_id: args.user_id, p_kind: args.kind, p_priority: args.priority, p_title: args.title,
    p_body: args.body, p_action_url: args.action_url, p_action_label: args.action_label,
    p_related_contact_id: args.related_contact_id, p_related_listing_id: null,
    p_entity_type: "contact", p_entity_id: args.related_contact_id, p_event_key: args.event_key,
  });
  if (error) {
    await supabase.from("notifications").insert({
      user_id: args.user_id, kind: args.kind, priority: args.priority, title: args.title, body: args.body,
      action_url: args.action_url, action_label: args.action_label, related_contact_id: args.related_contact_id,
      entity_type: "contact", entity_id: args.related_contact_id, event_key: args.event_key,
    });
  }
}

export const SELLER_LEAD_DRAFT_REPLY_KIND = "seller_lead_draft_reply";
export const SELLER_LEAD_ALERT_KIND = "seller_lead_alert";

async function enrolNurture(supabase: ServiceClient, ctx: SellerLeadContext): Promise<SellerLeadAutomationResult["nurture"]> {
  const { data: seqs } = await supabase.from("nurture_sequences").select("id, name").eq("user_id", ctx.ownerUserId).eq("is_active", true);
  const sequences = (seqs || []) as Array<{ id: string; name: string | null }>;
  if (sequences.length === 0) return "no_sequence";
  const preferred = sequences.find((s) => /seller|vendor|valuation|apprais|nurtur/i.test(s.name || "")) || sequences[0];
  const { data: steps } = await supabase.from("nurture_sequence_steps").select("offset_days, sort_order").eq("sequence_id", preferred.id).order("sort_order", { ascending: true }).limit(1);
  const firstStep = (steps || [])[0] as { offset_days: number | null } | undefined;
  if (!firstStep) return "no_sequence";
  const { data: existing } = await supabase.from("nurture_sequence_enrollments").select("id").eq("contact_id", ctx.contactId).eq("sequence_id", preferred.id).is("completed_at", null).limit(1);
  if ((existing || []).length > 0) return "skipped";
  const now = new Date();
  const next = new Date(now.getTime() + (firstStep.offset_days ?? 0) * 86_400_000);
  const { error } = await supabase.from("nurture_sequence_enrollments").insert({
    contact_id: ctx.contactId, sequence_id: preferred.id, user_id: ctx.ownerUserId,
    current_step_index: 0, started_at: now.toISOString(), next_step_at: next.toISOString(), pause_followup_cadence: false,
  });
  return error ? "no_sequence" : "enrolled";
}

export async function runSellerLeadAutomation(supabase: ServiceClient, ctx: SellerLeadContext): Promise<SellerLeadAutomationResult> {
  const result: SellerLeadAutomationResult = { ran: true, agentAlertSms: "skipped", prospectAck: "skipped", prospectEmail: "skipped", draftReply: "skipped", nurture: "skipped", notes: [] };
  const contactUrl = `/contacts/${ctx.contactId}`;
  const bookingLink = Deno.env.get("BOOKING_LINK") || null;
  const creds = mobileMessageCredsFromEnv();

  try {
    const agentMobile = Deno.env.get("AGENT_ALERT_MOBILE");
    if (agentMobile && creds) {
      const to = toE164Australia(agentMobile);
      const msg = composeAgentAlertSms(ctx);
      const batch = await postMobileMessageBatch(creds, [{ to, message: msg }]);
      const first = (batch.data?.results as Array<{ message_id?: string; status?: string; error?: string }> | undefined)?.[0];
      const isDelivered = mmDelivered(batch.ok, first?.status);
      result.agentAlertSms = isDelivered ? "sent" : "failed";
      const errorMsg = isDelivered ? null : (first?.error ? `Mobile Message: ${first.error}` : `Mobile Message: ${first?.status ?? `HTTP ${batch.status}`}`);
      await logOutboundSms(supabase, { user_id: ctx.ownerUserId, contact_id: ctx.contactId, to_phone: to, body: msg, provider: "mobile_message", provider_message_id: first?.message_id ?? null, status: isDelivered ? "sent" : "failed", error: errorMsg });
    } else {
      result.notes.push(!agentMobile ? "AGENT_ALERT_MOBILE not set" : "Mobile Message creds not set");
    }
  } catch (e) { result.agentAlertSms = "failed"; result.notes.push(`agent alert error: ${e instanceof Error ? e.message : String(e)}`); }

  try {
    await createNotification(supabase, { user_id: ctx.ownerUserId, kind: SELLER_LEAD_ALERT_KIND, priority: "urgent", title: `New appraisal lead: ${fullName(ctx.firstName, ctx.lastName)}`, body: `${ctx.address || "Address not given"} · timeline ${ctx.timeline || "n/a"} · ${ctx.phone || "no phone"}`, action_url: contactUrl, action_label: "View lead", related_contact_id: ctx.contactId, event_key: `${SELLER_LEAD_ALERT_KIND}:${ctx.contactId}` });
  } catch (e) { result.notes.push(`alert notif error: ${e instanceof Error ? e.message : String(e)}`); }

  try {
    if (ctx.phone && creds) {
      const to = toE164Australia(ctx.phone);
      const msg = composeProspectAckSms(ctx);
      const batch = await postMobileMessageBatch(creds, [{ to, message: msg }]);
      const first = (batch.data?.results as Array<{ message_id?: string; status?: string; error?: string }> | undefined)?.[0];
      const isDelivered = mmDelivered(batch.ok, first?.status);
      result.prospectAck = isDelivered ? "sent" : "failed";
      const errorMsg = isDelivered ? null : (first?.error ? `Mobile Message: ${first.error}` : `Mobile Message: ${first?.status ?? `HTTP ${batch.status}`}`);
      await logOutboundSms(supabase, { user_id: ctx.ownerUserId, contact_id: ctx.contactId, to_phone: to, body: msg, provider: "mobile_message", provider_message_id: first?.message_id ?? null, status: isDelivered ? "sent" : "failed", error: errorMsg });
    } else {
      result.notes.push(!ctx.phone ? "prospect ack: no phone" : "prospect ack: Mobile Message creds not set");
    }
  } catch (e) { result.prospectAck = "failed"; result.notes.push(`prospect ack error: ${e instanceof Error ? e.message : String(e)}`); }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (ctx.email && resendKey) {
      const from = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";
      const { subject, html } = composeProspectAckEmail(ctx);
      const payload: Record<string, unknown> = { from, to: [ctx.email], subject, html };
      const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      result.prospectEmail = res.ok ? "sent" : "failed";
      if (!res.ok) result.notes.push(`prospect email HTTP ${res.status}`);
      try {
        await supabase.from("interactions").insert({ contact_id: ctx.contactId, user_id: ctx.ownerUserId, type: "email", channel: "email", subject, body: `Auto-acknowledgement emailed to ${ctx.email}` });
      } catch (_e) { /* audit-only */ }
    } else {
      result.notes.push(!ctx.email ? "prospect email: no email" : "prospect email: RESEND_API_KEY not set");
    }
  } catch (e) { result.prospectEmail = "failed"; result.notes.push(`prospect email error: ${e instanceof Error ? e.message : String(e)}`); }

  try {
    const draft = composeLeadReplyDraft(ctx, bookingLink);
    await createNotification(supabase, { user_id: ctx.ownerUserId, kind: SELLER_LEAD_DRAFT_REPLY_KIND, priority: "action_required", title: `Approve reply to ${fullName(ctx.firstName, ctx.lastName)}`, body: draft, action_url: contactUrl, action_label: "Review & send", related_contact_id: ctx.contactId, event_key: `${SELLER_LEAD_DRAFT_REPLY_KIND}:${ctx.contactId}` });
    result.draftReply = "created";
  } catch (e) { result.notes.push(`draft reply error: ${e instanceof Error ? e.message : String(e)}`); }

  try {
    if (needsLongNurture(ctx.timeline)) result.nurture = await enrolNurture(supabase, ctx);
  } catch (e) { result.notes.push(`nurture error: ${e instanceof Error ? e.message : String(e)}`); }

  return result;
}
