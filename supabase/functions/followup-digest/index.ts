import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";
const APP_URL = Deno.env.get("APP_URL") || "https://app.example.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const { data: prefs, error: pErr } = await supabase
      .from("user_reminder_preferences")
      .select("user_id, digest_enabled, digest_frequency, last_digest_sent_at")
      .eq("digest_enabled", true);

    if (pErr) {
      return new Response(JSON.stringify({ error: pErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sent: { user_id: string; ok: boolean; reason?: string }[] = [];

    for (const pref of prefs ?? []) {
      const userId = pref.user_id as string;

      const { data: userData, error: authErr } = await supabase.auth.admin.getUserById(userId);
      if (authErr || !userData?.user?.email) {
        sent.push({ user_id: userId, ok: false, reason: authErr?.message ?? "no email" });
        continue;
      }
      const toEmail = userData.user.email;

      const { data: dueContacts, error: cErr } = await supabase
        .from("contacts")
        .select("id, name, next_follow_up_at")
        .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
        .not("next_follow_up_at", "is", null)
        .lte("next_follow_up_at", endOfToday.toISOString());

      if (cErr) {
        sent.push({ user_id: userId, ok: false, reason: cErr.message });
        continue;
      }

      const endIso = endOfToday.toISOString();
      const { data: openTasks, error: tErr } = await supabase
        .from("contact_tasks")
        .select("id, title, due_at, contact_id, contacts ( name )")
        .eq("user_id", userId)
        .is("completed_at", null)
        .or(`due_at.is.null,due_at.lte.${endIso}`);

      if (tErr) {
        sent.push({ user_id: userId, ok: false, reason: tErr.message });
        continue;
      }

      const contactsList = dueContacts ?? [];
      const tasksList = (openTasks ?? []) as {
        id: string;
        title: string;
        due_at: string | null;
        contact_id: string;
        contacts: { name: string | null } | null;
      }[];

      if (contactsList.length === 0 && tasksList.length === 0) {
        sent.push({ user_id: userId, ok: true, reason: "nothing due" });
        continue;
      }

      const contactRows = contactsList
        .map((c) => `<li><a href="${APP_URL}/contacts/${c.id}">${c.name ?? "Contact"}</a> — follow-up due</li>`)
        .join("");
      const taskRows = tasksList
        .map(
          (t) =>
            `<li>${t.title} (${t.contacts?.name ?? "Contact"})${t.due_at ? ` — ${new Date(t.due_at).toLocaleDateString()}` : ""}</li>`
        )
        .join("");

      const html = `
        <h2>Your CRM digest</h2>
        <p>Contacts due for follow-up or with follow-up date through today:</p>
        <ul>${contactRows || "<li>None</li>"}</ul>
        <p>Open contact tasks due through today:</p>
        <ul>${taskRows || "<li>None</li>"}</ul>
        <p><a href="${APP_URL}/follow-ups">Open Follow-ups</a> · <a href="${APP_URL}/tasks">Open Tasks</a></p>
        <p style="color:#666;font-size:12px">Data Dungeon CRM</p>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [toEmail],
          subject: `CRM digest: ${contactsList.length} follow-up(s), ${tasksList.length} task(s)`,
          html,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        sent.push({ user_id: userId, ok: false, reason: err?.message });
        continue;
      }

      await supabase
        .from("user_reminder_preferences")
        .update({ last_digest_sent_at: new Date().toISOString() })
        .eq("user_id", userId);

      sent.push({ user_id: userId, ok: true });
    }

    return new Response(JSON.stringify({ users: sent.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
