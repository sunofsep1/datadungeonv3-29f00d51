// buyer-enquiry-inbound — Buyer Inquiry Manager (Phase D)
//
// Receives a forwarded REA / Domain enquiry email (raw subject+body text from the
// Gmail sweep), parses the buyer + property, then:
//   1. INSTANTLY sends the branded ack email (BCC Greg) + ack SMS to the buyer
//      (no opt-out footer — transactional reply to their own enquiry)
//   2. Sends Greg an alert SMS so he can call while they're hot
//   3. Drops a "Buyer enquiry" card into the Note Inbox (injector_notes/proposals)
//      — contact-as-buyer + call-back task, reviewed & injected like any note.
//
// ALSO accepts structured website enquiries (5 Aug 2026): POST { website: true,
// gmail_message_id: "webreg-<id>", name, email, phone, property_address, comments }
// — same acks, same Greg alert, same Note Inbox card, source "website".
//
// Dedupe on gmail_message_id (stored in injector_notes.pocket_recording_id).
// Test switches: { dry_run: true } parses without sending/writing;
// { override_recipient: { email, phone } } redirects buyer-facing acks (testing).
// The 2-minute "human" delay is enforced by the sweep (only forwards mail ≥2 min old).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";
const MM_USER = Deno.env.get("MOBILE_MESSAGE_API_USER");
const MM_PASS = Deno.env.get("MOBILE_MESSAGE_API_PASSWORD");
const MM_SENDER = Deno.env.get("MOBILE_MESSAGE_SENDER");

const OWNER_USER_ID = "e1bd63ad-b120-4a5a-91c0-c3189bc8938c";
const GREG_EMAIL = "greg.leigh@qldsir.com";
const GREG_PHONE = "+61466805992";
const SITE = "https://gregleighproperty.com.au";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function grab(body: string, re: RegExp): string | null {
  const m = body.match(re);
  if (!m) return null;
  const v = (m[1] ?? "").trim();
  return v.length ? v : null;
}
function normalizePhone(p: string | null): string | null {
  if (!p) return null;
  const d = p.replace(/\D+/g, "");
  if (d.length === 9 && !d.startsWith("0")) return "+61" + d;
  if (d.length === 10 && d.startsWith("0")) return "+61" + d.slice(1);
  if (d.startsWith("61")) return "+" + d;
  return p.trim();
}
function shortAddr(a: string | null): string {
  if (!a) return "the property";
  return a.split(",")[0].trim();
}

type Enquiry = {
  source: "rea" | "domain" | "website";
  property_address: string | null;
  property_id: string | null;
  property_url: string | null;
  name: string;
  first_name: string;
  email: string | null;
  phone: string | null;
  about: string | null;
  wants: string | null;
  comments: string | null;
};

function sourceLabel(s: Enquiry["source"]): string {
  return s === "rea" ? "realestate.com.au" : s === "domain" ? "Domain" : "gregleighproperty.com.au";
}

/** Parse a (possibly forwarded) REA or Domain enquiry from raw email text. */
function parseEnquiry(subject: string, body: string): Enquiry | null {
  // Normalise: drop CRs and strip forwarded quote markers ("> ") so the same
  // field greps work whether the enquiry was forwarded (Outlook/Gmail) or sent
  // straight to the Resend inbound address by the portal.
  const b = body.replace(/\r/g, "").replace(/^[ \t]*>+[ \t]?/gm, "");
  const isRea = /realestate\.com\.au/i.test(b) && /Property address:/i.test(b);
  const isDomain = /domain\.com\.au/i.test(b) && /Email:/i.test(b) && !isRea;

  if (isRea) {
    const name = grab(b, /Name:\s*([^\n]+)/i) ?? "there";
    return {
      source: "rea",
      // Prefer the numeric REA id; fall back to the first token so a messy
      // "Property id: 151633612, 17 Elysium Road, ..." line doesn't swallow the address.
      property_id: grab(b, /Property id:\s*#?(\d+)/i) ?? grab(b, /Property id:\s*([^\n,]+)/i),
      property_address: grab(b, /Property address:\s*([^\n]+)/i),
      property_url: grab(b, /Property URL:\s*([^\n]+)/i),
      name,
      first_name: name.split(/\s+/)[0] ?? "there",
      email: grab(b, /Email:[ \t]*([^\n]*)/i),
      phone: normalizePhone(grab(b, /Phone:[ \t]*([^\n]*)/i)),
      about: grab(b, /About me:\s*([^\n]+)/i),
      wants: grab(b, /I would like to:\s*([^\n]+)/i),
      comments: grab(b, /Comments:\s*([\s\S]*?)(?:\n\s*\n|You can only use|$)/i),
    };
  }
  if (isDomain) {
    // Forwarded emails carry an Outlook "From: <buyer name>\nEmail:" header line.
    // Portal-direct Domain sends don't, so fall back to Domain's native fields
    // ("Name:" / "new enquiry from <name>") before giving up on the greeting.
    const name =
      grab(b, /From:\s*([^\n<]+?)\s*\n+\s*Email:/i) ??
      grab(b, /(?:Full name|Contact name|Name)\s*:\s*([^\n<]+)/i) ??
      grab(b, /enquir(?:y|ed)\s+from[:\s]+([A-Z][^\n<.,]{1,60})/i) ??
      grab(b, /From:\s*([^\n<]+?)(?:\n|<|$)/i) ??
      "there";
    const addr =
      grab(b, /property at\s*([^\n(<]+)/i) ??
      grab(subject, /Enquiry for\s*(?:FW:\s*)?(.+)/i);
    return {
      source: "domain",
      property_id: grab(b, /Domain ID\s*:\s*([\d]+)/i),
      property_address: addr ? addr.trim() : null,
      property_url: null,
      name,
      first_name: name.split(/\s+/)[0] ?? "there",
      email: grab(b, /Email:[ \t]*([^\n]*)/i),
      phone: normalizePhone(grab(b, /Phone:[ \t]*([^\n]*)/i)),
      about: null,
      wants: null,
      comments: grab(b, /Message:\s*([\s\S]*?)(?:Security Policy|Domain Holdings|$)/i),
    };
  }
  return null;
}

/** Build an Enquiry straight from a structured website payload (register-interest form). */
function websiteEnquiry(body: Record<string, unknown>): Enquiry {
  const nm = String(body.name ?? "").trim() || "there";
  return {
    source: "website",
    property_id: null,
    property_address: body.property_address ? String(body.property_address).trim() : null,
    property_url: null,
    name: nm,
    first_name: nm.split(/\s+/)[0] ?? "there",
    email: body.email ? String(body.email).trim().toLowerCase() : null,
    phone: normalizePhone(body.phone ? String(body.phone) : null),
    about: body.about ? String(body.about).trim() : null,
    wants: null,
    comments: body.comments ? String(body.comments).trim() : null,
  };
}

function ackEmailHtml(e: Enquiry): { subject: string; html: string } {
  const addr = e.property_address ?? "the property";
  const subject = `Your enquiry on ${shortAddr(e.property_address)} — Greg Leigh`;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&display=swap');</style></head>
<body style="margin:0;padding:0;background:#f3efe7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e8e1d4;">
        <tr><td bgcolor="#0e2140" style="background:#0e2140;padding:36px 40px;text-align:center;">
          <img src="https://redlandshomevalue.com.au/assets/brand/gl-logo-full-email.png" width="300" alt="Greg Leigh — Redlands Coast Real Estate" style="display:inline-block;width:300px;max-width:80%;height:auto;border:0;">
        </td></tr>
        <tr><td style="height:3px;line-height:3px;font-size:0;background:#b08d3f;">&nbsp;</td></tr>
        <tr><td style="padding:46px 48px 40px;font-family:Georgia,'Times New Roman',serif;color:#20242e;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#b08d3f;font-family:Arial,Helvetica,sans-serif;">Property Enquiry</p>
          <h1 style="margin:0 0 24px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-weight:600;font-size:33px;line-height:1.2;color:#0e2140;">Thanks ${esc(e.first_name)} &mdash; I&#39;ve got your enquiry.</h1>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">Thanks for reaching out about <strong>${esc(addr)}</strong>. I&#39;ve received your enquiry and I&#39;ll personally be in touch shortly with the answers you&#39;re after &mdash; price guidance, inspection times, whatever you need.</p>
          <p style="margin:0 0 26px;font-size:16px;line-height:1.75;">If it&#39;s urgent, call or text me directly on <strong>0466 805 992</strong> &mdash; I&#39;d rather you catch me than wait.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 34px;"><tr>
            <td bgcolor="#b08d3f" style="border-radius:2px;">
              <a href="${SITE}/listings" rel="noopener" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:.04em;color:#0e2140;text-decoration:none;">See my current listings &rarr;</a>
            </td>
          </tr></table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e1d4;"><tr><td style="padding-top:24px;">
            <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#0e2140;line-height:1.2;">Greg Leigh</div>
            <div style="margin-top:5px;font-size:13px;line-height:1.7;color:#6b6b6b;font-family:Arial,Helvetica,sans-serif;">Local Redlands Property Specialist<br>Queensland Sotheby&#39;s International Realty<br><a href="${SITE}" rel="noopener" style="color:#b08d3f;text-decoration:none;">gregleighproperty.com.au</a></div>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#f3efe7;padding:22px 40px;text-align:center;border-top:1px solid #e8e1d4;">
          <p style="margin:0;font-size:11px;line-height:1.7;color:#8a8a8a;font-family:Arial,Helvetica,sans-serif;">You&#39;re receiving this because you enquired about a property listed with Greg Leigh. Prefer not to hear from me? Just reply and let me know.<br>Each office is independently owned and operated.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { subject, html };
}

async function sendSms(to: string, message: string): Promise<{ ok: boolean; error: string | null; id: string | null }> {
  if (!(MM_USER && MM_PASS && MM_SENDER)) return { ok: false, error: "Mobile Message not configured", id: null };
  try {
    const auth = btoa(`${MM_USER}:${MM_PASS}`);
    const res = await fetch("https://api.mobilemessage.com.au/v1/messages", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ to, message, sender: MM_SENDER }] }),
    });
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) return { ok: false, error: (data?.error as string) || (data?.message as string) || `HTTP ${res.status}`, id: null };
    const first = (data?.results as Array<{ message_id?: string }> | undefined)?.[0];
    return { ok: true, error: null, id: first?.message_id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed", id: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method === "GET") return json({ ok: true, fn: "buyer-enquiry-inbound", email: Boolean(RESEND_API_KEY), sms: Boolean(MM_USER && MM_PASS && MM_SENDER), website_intake: true });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const isWebsite = body.website === true;
  const gmailId = String(body.gmail_message_id ?? "").trim();
  const subject = String(body.subject ?? "");
  const rawBody = String(body.body_text ?? "");
  const dryRun = body.dry_run === true;
  const override = (body.override_recipient ?? null) as { email?: string; phone?: string } | null;
  if (!gmailId || (!rawBody && !isWebsite)) return json({ error: "gmail_message_id and body_text required" }, 400);

  const enquiry = isWebsite ? websiteEnquiry(body) : parseEnquiry(subject, rawBody);
  if (!enquiry) return json({ ok: true, ignored: true, reason: "not a recognisable REA/Domain enquiry" });
  if (dryRun) return json({ ok: true, dry_run: true, parsed: enquiry });

  const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // Dedupe
  const { data: existing } = await svc.from("injector_notes").select("id").eq("user_id", OWNER_USER_ID).eq("pocket_recording_id", gmailId).maybeSingle();
  if (existing?.id) return json({ ok: true, already_processed: true, note_id: existing.id });

  // Contact match (phone → email)
  let matchId: string | null = null;
  let matchName: string | null = null;
  const digits = (enquiry.phone ?? "").replace(/\D+/g, "").slice(-9);
  if (digits.length === 9) {
    const { data } = await svc.from("contacts").select("id,name").eq("user_id", OWNER_USER_ID)
      .or(`mobile.ilike.%${digits}%,phone.ilike.%${digits}%`).limit(1);
    if (data?.length) { matchId = data[0].id; matchName = data[0].name; }
  }
  if (!matchId && enquiry.email) {
    const { data } = await svc.from("contacts").select("id,name").eq("user_id", OWNER_USER_ID).ilike("email", enquiry.email).limit(1);
    if (data?.length) { matchId = data[0].id; matchName = data[0].name; }
  }

  const acks: Record<string, unknown> = {};
  const toEmail = override?.email ?? enquiry.email;
  const toPhone = normalizePhone(override?.phone ?? enquiry.phone);

  // 1) Ack email (BCC Greg)
  if (RESEND_API_KEY && toEmail) {
    const { subject: subj, html } = ackEmailHtml(enquiry);
    const from = EMAIL_FROM.includes("<") ? EMAIL_FROM : `Greg Leigh <${EMAIL_FROM}>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [toEmail], bcc: [GREG_EMAIL], reply_to: GREG_EMAIL, subject: subj, html }),
    });
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    acks.email = res.ok ? { sent: true, id: (data as { id?: string })?.id ?? null } : { sent: false, error: (data as { message?: string })?.message ?? `HTTP ${res.status}` };
  } else acks.email = { sent: false, error: toEmail ? "RESEND not configured" : "no email in enquiry" };

  // 2) Ack SMS to buyer — NO opt-out footer (transactional reply to their enquiry)
  if (toPhone) {
    const msg = `Hi ${enquiry.first_name}, Greg Leigh from Queensland Sotheby's — thanks for your enquiry on ${shortAddr(enquiry.property_address)}. I'll be in touch shortly with the details you asked for. Anything urgent, call/text me on 0466 805 992.`;
    const r = await sendSms(toPhone, msg);
    acks.sms = r;
    await svc.from("sms_outbound").insert({
      user_id: OWNER_USER_ID, contact_id: matchId, to_phone: toPhone, body_preview: msg.slice(0, 200),
      provider: "mobile_message", provider_message_id: r.id, status: r.ok ? "sent" : "failed", error: r.error,
    });
  } else acks.sms = { ok: false, error: "no phone in enquiry" };

  // 3) Greg alert SMS
  {
    const intent = enquiry.about ? ` — ${enquiry.about}` : "";
    const alert = `New buyer enquiry: ${enquiry.name} — ${shortAddr(enquiry.property_address)} (${enquiry.source.toUpperCase()}${intent}). Ack email+SMS sent. ${enquiry.phone ?? "no phone"}`;
    const r = await sendSms(GREG_PHONE, alert.slice(0, 480));
    acks.greg_alert = r;
    await svc.from("sms_outbound").insert({
      user_id: OWNER_USER_ID, contact_id: null, to_phone: GREG_PHONE, body_preview: alert.slice(0, 200),
      provider: "mobile_message", provider_message_id: r.id, status: r.ok ? "sent" : "failed", error: r.error,
    });
  }

  // 4) Buyer card in the Note Inbox
  const summaryLines = [
    `# Buyer enquiry — ${enquiry.name}`,
    ``,
    `**Property:** ${enquiry.property_address ?? "—"}${enquiry.property_id ? ` (ID ${enquiry.property_id})` : ""}`,
    `**Source:** ${sourceLabel(enquiry.source)}`,
    `**Phone:** ${enquiry.phone ?? "—"}  **Email:** ${enquiry.email ?? "—"}`,
    enquiry.about ? `**About them:** ${enquiry.about}` : null,
    enquiry.wants ? `**They want:** ${enquiry.wants}` : null,
    enquiry.comments ? `\n**Message:**\n${enquiry.comments}` : null,
    `\nAck email ${((acks.email as { sent?: boolean })?.sent) ? "sent (copy BCC'd to you)" : "NOT sent"} · Ack SMS ${((acks.sms as { ok?: boolean })?.ok) ? "sent" : "NOT sent"}.`,
  ].filter(Boolean).join("\n");

  const { data: note, error: nErr } = await svc.from("injector_notes").insert({
    user_id: OWNER_USER_ID,
    pocket_recording_id: gmailId,
    title: `Buyer enquiry — ${enquiry.name} — ${shortAddr(enquiry.property_address)}`,
    summary_md: summaryLines,
    raw_payload: { source: "buyer_enquiry", ...enquiry, acks, gmail_message_id: gmailId },
    status: "extracted",
  }).select("id").single();
  if (nErr) return json({ error: `note insert: ${nErr.message}`, acks }, 500);

  const nameParts = enquiry.name.trim().split(/\s+/);
  const firstHome = /first home/i.test(enquiry.about ?? "");
  await svc.from("injector_proposals").insert([
    {
      note_id: note.id, user_id: OWNER_USER_ID, entity_type: "contact",
      action: matchId ? "update" : "create", match_contact_id: matchId, confidence: 0.95,
      proposed: {
        name: enquiry.name, first_name: nameParts[0] ?? null, last_name: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
        mobile: enquiry.phone, email: enquiry.email, ownership: "buyer",
        note: `Enquired on ${enquiry.property_address ?? "a listing"} via ${sourceLabel(enquiry.source)}${firstHome ? " (first-home buyer)" : ""}${enquiry.comments ? `: “${enquiry.comments.slice(0, 220)}”` : ""}`,
        evidence: enquiry.comments ? enquiry.comments.slice(0, 140) : (enquiry.wants ?? null),
        match_name: matchName,
        match_by: matchId ? (digits.length === 9 ? "phone" : "email") : null,
      },
    },
    {
      note_id: note.id, user_id: OWNER_USER_ID, entity_type: "task",
      action: "create", match_contact_id: matchId, confidence: 0.95,
      proposed: { title: `Call ${enquiry.first_name} re ${shortAddr(enquiry.property_address)} enquiry`, due: new Date().toISOString().slice(0, 10), contact_name: enquiry.name },
    },
  ]);

  return json({ ok: true, note_id: note.id, parsed: enquiry, acks });
});
