/**
 * Register-your-interest proxy (Netlify Function).
 *
 * A buyer on a listing page (gregleighproperty.com.au) submits name, mobile,
 * email and the suburb/postcode they live in. This function:
 *   1. Creates them as a BUYER lead in the CRM via the Supabase `inbound-lead`
 *      edge function (reuses the same secrets as lead-intake — no new keys).
 *   2. Emails Greg instantly via Resend so he can call while they're hot.
 *
 * The browser never sees any secret. CORS allows the listings site + the funnel.
 *
 * Netlify env vars (Site settings -> Environment variables):
 *   SUPABASE_URL            (already set — shared with lead-intake)
 *   INBOUND_WEBHOOK_SECRET  (already set — shared with lead-intake)
 *   LEAD_OWNER_USER_ID      (already set — shared with lead-intake)
 *   RESEND_API_KEY          (ADD THIS to enable the instant email; same key as Supabase)
 *   REGISTER_INTEREST_FROM  (optional; default "Greg Leigh <greg@redlandshomevalue.com.au>")
 *   REGISTER_INTEREST_TO    (optional; default "greg.leigh@qldsir.com")
 */

const ALLOWED_ORIGINS = new Set([
  "https://gregleighproperty.com.au",
  "https://www.gregleighproperty.com.au",
  "https://redlandshomevalue.com.au",
  "https://www.redlandshomevalue.com.au",
]);

const HITS = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 6;
function rateLimited(ip) {
  const now = Date.now();
  const rec = HITS.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) {
    HITS.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

function corsHeaders(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://gregleighproperty.com.au";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

const json = (statusCode, obj, extra) => ({
  statusCode,
  headers: { "Content-Type": "application/json", ...(extra || {}) },
  body: JSON.stringify(obj),
});

const esc = (s) =>
  String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

exports.handler = async (event) => {
  const cors = corsHeaders(event);
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { Allow: "POST, OPTIONS", ...cors }, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" }, cors);
  }

  const ip =
    (event.headers &&
      (event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "")) ||
    "unknown";
  if (rateLimited(ip.split(",")[0].trim())) {
    return json(429, { ok: false, error: "Too many requests" }, cors);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" }, cors);
  }

  // Honeypot — real users leave `company` empty. Silently accept.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return json(200, { ok: true }, cors);
  }

  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const first_name = str(body.first_name).slice(0, 80);
  const last_name = str(body.last_name).slice(0, 80);
  const email = str(body.email).toLowerCase().slice(0, 160);
  const phone = str(body.phone).slice(0, 40);
  const suburb = str(body.suburb).slice(0, 120);
  const postcode = str(body.postcode).slice(0, 12);
  const listing = str(body.listing).slice(0, 160) || "a listing";

  // Which of the advertised viewings they picked. Whitelisted rather than free
  // text so nothing arbitrary can be posted into the notification email.
  const VIEWINGS = {
    "2026-08-27": "Thursday 27 August, 5:30-6:15pm",
    "2026-09-03": "Thursday 3 September, 5:30-6:15pm",
    either: "Either date suits",
  };
  const viewingKey = str(body.viewing).slice(0, 20);
  const viewing = Object.prototype.hasOwnProperty.call(VIEWINGS, viewingKey)
    ? VIEWINGS[viewingKey]
    : "";

  if (!first_name || !last_name) {
    return json(400, { ok: false, error: "Name is required" }, cors);
  }
  if (!email && !phone) {
    return json(400, { ok: false, error: "Email or mobile is required" }, cors);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const INBOUND_WEBHOOK_SECRET = process.env.INBOUND_WEBHOOK_SECRET;
  const LEAD_OWNER_USER_ID = process.env.LEAD_OWNER_USER_ID;
  if (!SUPABASE_URL || !INBOUND_WEBHOOK_SECRET || !LEAD_OWNER_USER_ID) {
    console.error("[register-interest] Missing required env vars");
    return json(500, { ok: false, error: "Server not configured" }, cors);
  }

  const whereFrom = [suburb, postcode].filter(Boolean).join(" ");
  const notes =
    `Registered interest in ${listing} via the website. ` +
    (viewing ? `Wants the ${viewing} viewing. ` : "") +
    `Buyer${whereFrom ? ` lives in ${whereFrom}` : ""}.` +
    (phone ? ` Mobile: ${phone}.` : "");

  // 1) Create the buyer in the CRM (same edge function lead-intake uses).
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/inbound-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INBOUND_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        owner_user_id: LEAD_OWNER_USER_ID,
        lead_type: "buyer",
        first_name,
        last_name,
        email: email || undefined,
        phone: phone || undefined,
        property_interest: listing,
        notes,
        source: "website_register_interest",
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("[register-interest] inbound-lead error", resp.status, detail);
      return json(502, { ok: false, error: "Upstream error" }, cors);
    }
  } catch (err) {
    console.error("[register-interest] inbound-lead fetch failed", err);
    return json(502, { ok: false, error: "Upstream unreachable" }, cors);
  }

  // 2) Instant email to Greg (best-effort — only if RESEND_API_KEY is set).
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (RESEND_API_KEY) {
    const from = process.env.REGISTER_INTEREST_FROM || "Greg Leigh <greg@redlandshomevalue.com.au>";
    const to = process.env.REGISTER_INTEREST_TO || "greg.leigh@qldsir.com";
    const html =
      `<h2 style="font-family:Arial,sans-serif;color:#172849;margin:0 0 12px;">New interest registered</h2>` +
      `<p style="font-family:Arial,sans-serif;font-size:15px;color:#333;margin:0 0 12px;"><strong>${esc(listing)}</strong></p>` +
      `<table style="font-family:Arial,sans-serif;font-size:14px;color:#333;border-collapse:collapse;">` +
      `<tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td style="padding:4px 0;"><strong>${esc(first_name)} ${esc(last_name)}</strong></td></tr>` +
      (viewing
        ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Viewing</td><td style="padding:4px 0;"><strong style="color:#B99A50;">${esc(viewing)}</strong></td></tr>`
        : "") +
      `<tr><td style="padding:4px 12px 4px 0;color:#666;">Mobile</td><td style="padding:4px 0;">${esc(phone) || "—"}</td></tr>` +
      `<tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td style="padding:4px 0;">${esc(email) || "—"}</td></tr>` +
      `<tr><td style="padding:4px 12px 4px 0;color:#666;">Lives in</td><td style="padding:4px 0;">${esc(whereFrom) || "—"}</td></tr>` +
      `</table>` +
      `<p style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin:16px 0 0;">Added to your CRM as a buyer lead. Reply to this email to reach ${esc(first_name)} directly.</p>`;
    try {
      const mail = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: email || undefined,
          subject: viewing
            ? `New interest: ${first_name} ${last_name} — ${viewing.split(",")[0]}`
            : `New interest: ${listing} — ${first_name} ${last_name}`,
          html,
        }),
      });
      if (!mail.ok) console.error("[register-interest] resend error", mail.status, await mail.text().catch(() => ""));
    } catch (err) {
      console.error("[register-interest] resend fetch failed", err); // non-fatal
    }
  }

  return json(200, { ok: true }, cors);
};
