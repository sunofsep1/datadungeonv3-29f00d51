/**
 * Newsletter signup proxy (Netlify Function).
 *
 * Public pages POST here (redlandshomevalue.com.au AND the embed snippet on
 * gregleighproperty.com.au — hence the CORS allow-list). Injects the shared
 * secret server-side and forwards to the Supabase `newsletter-subscribe`
 * edge function. The browser never sees the secret.
 *
 * Reuses the same Netlify env vars as lead-intake:
 *   SUPABASE_URL, INBOUND_WEBHOOK_SECRET
 */

const ALLOWED_ORIGINS = new Set([
  "https://redlandshomevalue.com.au",
  "https://www.redlandshomevalue.com.au",
  "https://gregleighproperty.com.au",
  "https://www.gregleighproperty.com.au",
]);

// Tiny in-memory rate limiter (per warm instance) — same as lead-intake.
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
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://redlandshomevalue.com.au";
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

  // Honeypot: real users leave `company` empty. Silently accept.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return json(200, { ok: true }, cors);
  }

  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const email = str(body.email).toLowerCase();
  const first_name = str(body.first_name).slice(0, 80);
  const last_name = str(body.last_name).slice(0, 80);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { ok: false, error: "A valid email is required" }, cors);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const INBOUND_WEBHOOK_SECRET = process.env.INBOUND_WEBHOOK_SECRET;
  if (!SUPABASE_URL || !INBOUND_WEBHOOK_SECRET) {
    console.error("[newsletter-subscribe] Missing required env vars");
    return json(500, { ok: false, error: "Server not configured" }, cors);
  }

  // Allow-list source by referrer origin.
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || "";
  const source = origin.includes("gregleighproperty")
    ? "newsletter_glp_site"
    : "newsletter_valuation_lp";

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INBOUND_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({ email, first_name, last_name, source }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("[newsletter-subscribe] upstream error", resp.status, detail);
      return json(502, { ok: false, error: "Upstream error" }, cors);
    }
    return json(200, { ok: true }, cors);
  } catch (err) {
    console.error("[newsletter-subscribe] fetch failed", err);
    return json(502, { ok: false, error: "Upstream unreachable" }, cors);
  }
};
