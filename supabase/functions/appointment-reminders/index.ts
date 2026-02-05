import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";

// Remind X hours before appointment
const REMINDER_HOURS = 24;

function getContactEmail(contact: { email?: string | null; contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean }> } | null): string | null {
  if (!contact) return null;
  const channels = contact.contact_channels ?? [];
  const primary = channels.find((c: any) => c.channel_type === "email" && c.is_primary);
  if (primary?.value) return String(primary.value);
  const anyEmail = channels.find((c: any) => c.channel_type === "email" && c.value);
  if (anyEmail?.value) return String(anyEmail.value);
  return contact.email ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cron invokes with Authorization: Bearer <anon or service key>; allow service role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        reminder_sent_at,
        contacts (
          id,
          name,
          email,
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

    const results: { id: string; sent: boolean; reason?: string }[] = [];

    for (const apt of appointments || []) {
      const contact = apt.contacts as any;
      const email = contact ? getContactEmail(contact) : null;
      if (!email) {
        results.push({ id: apt.id, sent: false, reason: "No contact email" });
        continue;
      }

      const aptDate = new Date(apt.date);
      const subject = `Reminder: ${apt.title} – ${aptDate.toLocaleDateString()} at ${aptDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      const body = `
        <p>Hi${contact?.name ? ` ${contact.name}` : ""},</p>
        <p>This is a reminder about your upcoming appointment:</p>
        <p><strong>${apt.title}</strong></p>
        <p>${aptDate.toLocaleDateString()} at ${aptDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
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
            html: body,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          results.push({ id: apt.id, sent: false, reason: err?.message || "Resend failed" });
          continue;
        }

        await supabase
          .from("appointments")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", apt.id);

        results.push({ id: apt.id, sent: true });
      } catch (e) {
        results.push({ id: apt.id, sent: false, reason: e instanceof Error ? e.message : "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
