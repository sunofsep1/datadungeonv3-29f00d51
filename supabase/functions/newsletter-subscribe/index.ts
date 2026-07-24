// newsletter-subscribe — "Join my exclusive list" signups (server-side, 24/7)
//
// Called by the lead-funnel Netlify proxy (which injects the shared secret) for
// signups from redlandshomevalue.com.au AND the embed snippet on
// gregleighproperty.com.au. Does three things:
//   1. CRM: create/update the contact (tag "newsletter", email_opt_out=false)
//   2. Resend Audience: POST /contacts so Broadcasts can reach them
//   3. Welcome email: instant on-brand "you're in" note (BCC Greg)
//
// Deploy: npx supabase functions deploy newsletter-subscribe --no-verify-jwt
// Auth: Authorization: Bearer <INBOUND_WEBHOOK_SECRET> (same pattern as inbound-lead).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("INBOUND_WEBHOOK_SECRET") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";

const OWNER_USER_ID = "e1bd63ad-b120-4a5a-91c0-c3189bc8938c";
const GREG_BCC = "greg.leigh@qldsir.com";
const SITE = "https://redlandshomevalue.com.au";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function authed(req: Request): boolean {
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Bearer ")) return false;
  const token = h.slice(7).trim();
  return Boolean(token) && (token === WEBHOOK_SECRET || token === SERVICE_KEY);
}

function welcomeHtml(firstName: string): string {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#FEFBF5;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:'Source Sans 3',-apple-system,'Segoe UI',sans-serif;color:#1a1a1a;">
  <div style="text-align:center;padding-bottom:20px;border-bottom:2px solid #B99A50;">
    <img src="${SITE}/assets/qsir-logo-navy.png" alt="Queensland Sotheby's International Realty" width="200" style="max-width:200px;height:auto;margin:0 auto;" />
  </div>
  <h1 style="font-family:Georgia,'Times New Roman',serif;color:#172849;font-size:26px;font-weight:600;margin:28px 0 12px;">You&rsquo;re on the inside now.</h1>
  <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">${hi}</p>
  <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">Thanks for joining my private list. Here&rsquo;s what lands in your inbox from me &mdash; and nobody else&rsquo;s:</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
    <tr><td style="padding:6px 10px 6px 0;color:#B99A50;font-weight:700;vertical-align:top;">&#9670;</td><td style="padding:6px 0;font-size:15px;line-height:1.5;"><strong>Off-market listings</strong> &mdash; homes for sale in the Redlands that never hit the portals. You hear first.</td></tr>
    <tr><td style="padding:6px 10px 6px 0;color:#B99A50;font-weight:700;vertical-align:top;">&#9670;</td><td style="padding:6px 0;font-size:15px;line-height:1.5;"><strong>Straight-talking market updates</strong> &mdash; what's actually selling, for what, and why. Real numbers, no fluff.</td></tr>
    <tr><td style="padding:6px 10px 6px 0;color:#B99A50;font-weight:700;vertical-align:top;">&#9670;</td><td style="padding:6px 0;font-size:15px;line-height:1.5;"><strong>Buying &amp; selling intel</strong> &mdash; what you need to know to move smart in a changing market.</td></tr>
  </table>
  <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">No spam, no daily drip &mdash; just the things worth knowing, when they're worth knowing.</p>
  <p style="font-size:16px;line-height:1.55;margin:0 0 6px;">Talk soon,</p>
  <p style="font-size:16px;line-height:1.4;margin:0;"><strong style="color:#172849;">Greg Leigh</strong><br/>
  <span style="font-size:14px;color:#555;">Queensland Sotheby&rsquo;s International Realty &middot; Redlands QLD</span><br/>
  <a href="https://gregleighproperty.com.au" style="font-size:14px;color:#172849;">gregleighproperty.com.au</a></p>
  <p style="font-size:12px;color:#999;margin:28px 0 0;border-top:1px solid #E2E3E5;padding-top:14px;">You're receiving this because you joined Greg's list. Don't want these? Just reply &ldquo;unsubscribe&rdquo; and you're out &mdash; no hard feelings.</p>
</div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method === "GET") {
    return json({ ok: true, fn: "newsletter-subscribe", configured: Boolean(WEBHOOK_SECRET), resend_api: Boolean(RESEND_API_KEY) });
  }
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!authed(req)) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const firstName = String(body.first_name ?? "").trim();
  const lastName = String(body.last_name ?? "").trim();
  const source = String(body.source ?? "newsletter_signup").slice(0, 60);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "valid email required" }, 400);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // ---- 1) CRM contact: update-if-exists (fill blanks, add tag), else create ----
  const { data: existing } = await svc
    .from("contacts")
    .select("id, first_name, last_name, tags, email_opt_out")
    .eq("user_id", OWNER_USER_ID)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  let contactId: string;
  let already = false;
  if (existing) {
    contactId = existing.id;
    const tags: string[] = Array.isArray(existing.tags) ? existing.tags : [];
    already = tags.includes("newsletter");
    const patch: Record<string, unknown> = {};
    if (!already) patch.tags = [...tags, "newsletter"];
    if (existing.email_opt_out) patch.email_opt_out = false; // they explicitly re-opted in
    if (!existing.first_name && firstName) patch.first_name = firstName;
    if (!existing.last_name && lastName) patch.last_name = lastName;
    if (Object.keys(patch).length) await svc.from("contacts").update(patch).eq("id", contactId);
  } else {
    const { data: created, error } = await svc
      .from("contacts")
      .insert({
        user_id: OWNER_USER_ID,
        first_name: firstName || null,
        last_name: lastName || null,
        name: [firstName, lastName].filter(Boolean).join(" ") || null,
        email,
        source,
        lead_status: "new",
        tags: ["newsletter"],
        email_opt_out: false,
      })
      .select("id")
      .single();
    if (error) return json({ error: `create contact: ${error.message}` }, 500);
    contactId = created.id;
  }

  // ---- 2) Resend Audience contact (so Broadcasts reach them) ----
  let resendOk = false;
  try {
    const r = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, first_name: firstName || undefined, last_name: lastName || undefined, unsubscribed: false }),
    });
    resendOk = r.ok || r.status === 409; // 409 = already a contact, fine
    if (!resendOk) console.error("resend contact create failed", r.status, await r.text().catch(() => ""));
  } catch (e) {
    console.error("resend contact create threw", e);
  }

  // ---- 3) Welcome email (skip if they were already on the list — no double-welcome) ----
  let welcomed = false;
  if (!already) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: EMAIL_FROM.includes("<") ? EMAIL_FROM : `Greg Leigh <${EMAIL_FROM}>`,
          to: [email],
          bcc: [GREG_BCC],
          subject: "You're in — off-markets & Redlands market intel, first",
          html: welcomeHtml(firstName),
        }),
      });
      welcomed = r.ok;
      if (!r.ok) console.error("welcome email failed", r.status, await r.text().catch(() => ""));
    } catch (e) {
      console.error("welcome email threw", e);
    }
  }

  return json({ ok: true, contact_id: contactId, already_subscribed: already, resend: resendOk, welcomed });
});
