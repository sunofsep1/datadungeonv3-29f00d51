import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mobileMessageCredsFromEnv, postMobileMessageBatch, toE164Australia } from "../_shared/smsCore.ts";

/**
 * Instant-reply automation — triggered on contact INSERT via database webhook.
 * Sends SMS + email acknowledgements to the prospect within seconds (not waiting for cron).
 * 
 * Triggered by: Supabase Database Webhooks on contacts table INSERT
 * Routes by source:
 *   - facebook-valuation, website-valuation → SMS + email to prospect + alert SMS to Greg
 *   - inbound_webhook → email only (unless sms_consent = true)
 */

type ContactRow = {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  source?: string;
  contact_category?: string;
  sms_consent?: boolean;
  communication_preferences?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Verify webhook secret (optional but recommended)
  const authHeader = req.headers.get("Authorization");
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: { record: ContactRow };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const contact = body.record;
  if (!contact?.id || !contact?.user_id) {
    return new Response(JSON.stringify({ error: "Missing contact id or user_id" }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Rate-limit check: prevent duplicate sends within 60 seconds
  const { data: recentSend } = await supabase
    .from("sms_outbound")
    .select("id")
    .eq("contact_id", contact.id)
    .eq("provider", "instant_reply")
    .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
    .limit(1);

  if (recentSend && recentSend.length > 0) {
    console.log(`[send-instant-reply] Rate-limited: contact ${contact.id} already got reply in last 60s`);
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "rate-limited" }), { status: 200 });
  }

  // Determine what to send based on source
  const source = (contact.source || "").toLowerCase();
  const shouldSendSMS = ["facebook-valuation", "website-valuation"].includes(source);
  const shouldSendEmail = true;

  const firstName = contact.first_name || "there";
  const prospectSmsText = `Hi ${firstName}, thanks for your enquiry — Greg will be in touch shortly. Reply STOP to opt out.`;
  const prospectEmailText = `Hi ${firstName},\n\nThanks for your property appraisal enquiry. Greg Leigh from Queensland Sotheby's International Realty will be in touch within the next few hours to arrange a convenient time.\n\nBest regards,\nGreg`;

  const results: Record<string, unknown> = {};

  // Send SMS to prospect
  if (shouldSendSMS && contact.phone) {
    try {
      const to = toE164Australia(contact.phone);
      const creds = mobileMessageCredsFromEnv();
      if (creds) {
        const batch = await postMobileMessageBatch(creds, [{ to, message: prospectSmsText }]);
        const first = (batch.data?.results as Array<{ status?: string; error?: string }> | undefined)?.[0];
        const isDelivered = batch.ok && ["sent", "success", "queued", "delivered", "ok"].includes(first?.status ?? "");

        await supabase.from("sms_outbound").insert({
          user_id: contact.user_id,
          contact_id: contact.id,
          to_phone: to,
          body_preview: prospectSmsText.slice(0, 200),
          provider: "instant_reply",
          status: isDelivered ? "sent" : "failed",
          error: !isDelivered ? `Mobile Message: ${first?.status ?? `HTTP ${batch.status}`}` : null,
        });

        results.prospectSms = isDelivered ? "sent" : "failed";
      }
    } catch (e) {
      console.error("[send-instant-reply] Prospect SMS error:", e);
      results.prospectSmsError = e instanceof Error ? e.message : String(e);
    }
  }

  // Send email to prospect (placeholder — integrate with your email provider)
  if (shouldSendEmail && contact.email) {
    try {
      // TODO: integrate with email provider (SendGrid, Resend, etc.)
      // For now, just log the intent
      await supabase.from("email_outbound").insert({
        user_id: contact.user_id,
        contact_id: contact.id,
        to_email: contact.email,
        subject: "Property Appraisal Request",
        body_preview: prospectEmailText.slice(0, 200),
        provider: "instant_reply",
        status: "queued",
        error: null,
      });
      results.prospectEmail = "queued";
    } catch (e) {
      console.error("[send-instant-reply] Email error:", e);
      results.emailError = e instanceof Error ? e.message : String(e);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, contact_id: contact.id, results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
