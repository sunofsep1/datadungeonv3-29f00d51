// email-inbound-bridge — the 24/7 server-side email bridge (streamlined ingestion)
//
// Replaces the fragile Cowork Gmail-polling sweeps. Resend Inbound receives mail at
// <anything>@<id>.resend.app and fires an email.received webhook here. We then:
//   • notes@…  (or any mail from heypocket.com)      → injector_notes  (Note Master pipeline)
//   • leads@…  (or REA / Domain enquiry content)      → buyer-enquiry-inbound (instant ack + Buyer card)
//   • anything else                                   → ignored (logged in response only)
//
// Security: Svix webhook signature verification (RESEND_WEBHOOK_SECRET, from the
// Resend webhook settings — starts with "whsec_"). 503s until the secret is set.
// Bodies are fetched via GET api.resend.com/emails/receiving/{id} (webhook has metadata only).
// Dedupe: injector_notes.pocket_recording_id / buyer fn's gmail_message_id = Resend email_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

const OWNER_USER_ID = "e1bd63ad-b120-4a5a-91c0-c3189bc8938c";
const TOLERANCE_MS = 5 * 60 * 1000;

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

/** Svix signature check: v1 sig = base64(HMAC-SHA256(base64decode(secret_after_whsec_), `${id}.${ts}.${payload}`)) */
async function verifySvix(secret: string, id: string, ts: string, payload: string, sigHeader: string): Promise<boolean> {
  try {
    const tsNum = Number(ts) * 1000;
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > TOLERANCE_MS) return false;
    const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${payload}`));
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    // header form: "v1,<base64sig>" possibly space-separated multiples
    return sigHeader.split(/\s+/).some((part) => {
      const sig = part.startsWith("v1,") ? part.slice(3) : part;
      if (sig.length !== expected.length) return false;
      let r = 0;
      for (let i = 0; i < sig.length; i++) r |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
      return r === 0;
    });
  } catch (_) {
    return false;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanTitle(subject: string): string {
  return subject.replace(/^\s*((fwd?|re)\s*:\s*)+/i, "").replace(/^\s*your summary\s*:\s*/i, "").trim() || "(untitled)";
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return json({ ok: true, fn: "email-inbound-bridge", configured: Boolean(WEBHOOK_SECRET), resend_api: Boolean(RESEND_API_KEY) });
  }
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!WEBHOOK_SECRET) return json({ error: "RESEND_WEBHOOK_SECRET not set" }, 503);
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not set" }, 503);

  const payload = await req.text();
  const svixId = req.headers.get("svix-id") ?? "";
  const svixTs = req.headers.get("svix-timestamp") ?? "";
  const svixSig = req.headers.get("svix-signature") ?? "";
  if (!(await verifySvix(WEBHOOK_SECRET, svixId, svixTs, payload, svixSig))) {
    return json({ error: "bad signature" }, 401);
  }

  let event: { type?: string; data?: { email_id?: string; from?: string; to?: string[]; subject?: string } };
  try { event = JSON.parse(payload); } catch { return json({ error: "invalid json" }, 400); }
  if (event.type !== "email.received") return json({ ok: true, ignored: event.type ?? null });

  const emailId = event.data?.email_id ?? "";
  if (!emailId) return json({ error: "no email_id" }, 400);
  const toList = (event.data?.to ?? []).map((t) => t.toLowerCase());
  const fromAddr = (event.data?.from ?? "").toLowerCase();

  // Fetch full content (webhook carries metadata only)
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!res.ok) return json({ error: `fetch email: HTTP ${res.status}` }, 502);
  const email = await res.json() as { subject?: string; text?: string | null; html?: string | null; from?: string };
  const subject = email.subject ?? event.data?.subject ?? "";
  const bodyText = (email.text && email.text.trim()) ? email.text : stripHtml(email.html ?? "");

  const isNotesAddr = toList.some((t) => t.startsWith("notes@"));
  const isLeadsAddr = toList.some((t) => t.startsWith("leads@"));
  const isPocket = fromAddr.includes("heypocket.com") || /heypocket/i.test(bodyText.slice(0, 400));
  const looksBuyer = /realestate\.com\.au|domain\.com\.au/i.test(bodyText) && /(Property address:|Enquiry for)/i.test(subject + "\n" + bodyText);

  // ---- Route 1: buyer enquiry → existing instant-ack pipeline ----
  if (isLeadsAddr || (!isNotesAddr && looksBuyer)) {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/buyer-enquiry-inbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ gmail_message_id: emailId, subject, body_text: bodyText }),
    });
    const out = await r.json().catch(() => ({}));
    return json({ ok: true, routed: "buyer-enquiry", result: out });
  }

  // ---- Route 2: Pocket note (or anything to notes@) → Note Master ----
  if (isNotesAddr || isPocket) {
    // Skip Pocket marketing mail (only real summaries have substance)
    if (isPocket && !isNotesAddr && bodyText.length < 300) return json({ ok: true, ignored: "short heypocket mail (marketing?)" });
    const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const title = cleanTitle(subject);
    const { data: existing } = await svc
      .from("injector_notes")
      .select("id")
      .eq("user_id", OWNER_USER_ID)
      .or(`pocket_recording_id.eq.${emailId},and(title.eq.${title.replace(/[,()]/g, " ")},created_at.gte.${new Date(Date.now() - 24 * 3600_000).toISOString()})`)
      .limit(1);
    if (existing?.length) return json({ ok: true, routed: "note", already_processed: true });
    const { data: inserted, error } = await svc.from("injector_notes").insert({
      user_id: OWNER_USER_ID,
      pocket_recording_id: emailId,
      title,
      summary_md: bodyText,
      raw_payload: { source: "resend_inbound", from: fromAddr, to: toList, subject, resend_email_id: emailId },
      status: "received",
    }).select("id").single();
    if (error) return json({ error: `note insert: ${error.message}` }, 500);
    return json({ ok: true, routed: "note", note_id: inserted.id });
  }

  return json({ ok: true, ignored: "unrecognised sender/recipient", from: fromAddr, to: toList });
});
