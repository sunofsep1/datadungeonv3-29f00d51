import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  mobileMessageCredsFromEnv,
  postMobileMessageBatch,
  toE164Australia,
} from "../_shared/smsCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";

const REMINDER_HOURS = 24;
const wantSms =
  Deno.env.get("APPOINTMENT_REMINDER_SMS") === "1" ||
  Deno.env.get("APPOINTMENT_REMINDER_SMS") === "true";

const mmCreds = mobileMessageCredsFromEnv();

function getContactEmail(contact: {
  email?: string | null;
  contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean }>;
} | null): string | null {
  if (!contact) return null;
  const channels = contact.contact_channels ?? [];
  const primary = channels.find((c: any) => c.channel_type === "email" && c.is_primary);
  if (primary?.value) return String(primary.value);
  const anyEmail = channels.find((c: any) => c.channel_type === "email" && c.value);
  if (anyEmail?.value) return String(anyEmail.value);
  return contact.email ?? null;
}

function getContactPhone(contact: {
  mobile?: string | null;
  phone?: string | null;
  contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean | null }>;
} | null): string | null {
  if (!contact) return null;
  const channels = contact.contact_channels ?? [];
  const primary = channels.find((c) => c.channel_type === "phone" && c.is_primary && c.value);
  if (primary?.value) return String(primary.value);
  const anyP = channels.find((c) => c.channel_type === "phone" && c.value);
  if (anyP?.value) return String(anyP.value);
  return contact.mobile ?? contact.phone ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (!RESEND_API_KEY && !(wantSms && mmCreds)) {
      return new Response(
        JSON.stringify({
          error:
            "Configure RESEND_API_KEY for email reminders, or set APPOINTMENT_REMINDER_SMS=1 with Mobile Message secrets for SMS.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date();
    const windowStart = new Date(now.getTime());
    const windowEnd = new Date(now.getTime() + REMINDER_HOURS * 60 * 60 * 1000);

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        title,
        date,
        location,
        contact_id,
        user_id,
        reminder_sent_at,
        contacts (
          id,
          name,
          email,
          mobile,
          phone,
          sms_opt_out,
          contact_channels (channel_type, value, is_primary)
        )
      `)
      .is("reminder_sent_at", null)
      .gte("date", windowStart.toISOString())
      .lte("date", windowEnd.toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; sent: boolean; reason?: string; email?: boolean; sms?: boolean }[] = [];

    for (const apt of appointments || []) {
      const contact = apt.contacts as any;
      const aptDate = new Date(apt.date);
      const dateStr = `${aptDate.toLocaleDateString()} at ${aptDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

      let emailOk = false;
      let smsOk = false;

      const email = contact ? getContactEmail(contact) : null;
      if (RESEND_API_KEY && email) {
        const subject = `Reminder: ${apt.title} – ${dateStr}`;
        const html = `
        <p>Hi${contact?.name ? ` ${contact.name}` : ""},</p>
        <p>This is a reminder about your upcoming appointment:</p>
        <p><strong>${apt.title}</strong></p>
        <p>${dateStr}</p>
        ${apt.location ? `<p>Location: ${apt.location}</p>` : ""}
        <p>— Data Dungeon</p>
      `;
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: EMAIL_FROM,
              to: [email],
              subject,
              html,
            }),
          });
          emailOk = res.ok;
        } catch {
          emailOk = false;
        }
      }

      if (wantSms && mmCreds && contact && contact.sms_opt_out !== true) {
        const raw = getContactPhone(contact);
        if (raw?.trim()) {
          let to = raw.trim().replace(/\s/g, "");
          if (/^0?4\d{8}$/.test(to.replace(/\D/g, "")) || /^61\d{9}$/.test(to.replace(/\D/g, ""))) {
            to = toE164Australia(to);
          }
          const smsText =
            `Reminder: ${apt.title} — ${dateStr}` +
            (apt.location ? ` @ ${apt.location}` : "") +
            " — Data Dungeon";
          try {
            const batch = await postMobileMessageBatch(mmCreds, [{ to, message: smsText }]);
            smsOk = batch.ok;
            if (batch.ok && apt.user_id && contact.id) {
              const first = (batch.data?.results as Array<{ message_id?: string }> | undefined)?.[0];
              await supabase.from("sms_outbound").insert({
                user_id: apt.user_id,
                contact_id: contact.id,
                to_phone: to,
                body_preview: smsText.length > 200 ? `${smsText.slice(0, 200)}…` : smsText,
                provider: "mobile_message",
                provider_message_id: first?.message_id ?? null,
                status: "sent",
                error: null,
              });
            }
          } catch {
            smsOk = false;
          }
        }
      }

      const delivered = emailOk || smsOk;
      if (!delivered) {
        let reason = "No email or SMS sent";
        if (!email && !RESEND_API_KEY) reason = "No contact email and email not configured";
        else if (!email) reason = "No contact email";
        else if (!emailOk && !wantSms) reason = "Email failed";
        else if (wantSms && !smsOk && contact?.sms_opt_out) reason = "SMS opted out";
        else if (wantSms && !smsOk) reason = "SMS failed or no phone";
        results.push({ id: apt.id, sent: false, reason, email: emailOk, sms: smsOk });
        continue;
      }

      await supabase
        .from("appointments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", apt.id);

      results.push({ id: apt.id, sent: true, email: emailOk, sms: smsOk });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
