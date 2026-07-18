/**
 * Secure lead-intake proxy (Netlify Function).
 *
 * The public landing page POSTs here. This function injects the server-side
 * secrets (INBOUND_WEBHOOK_SECRET + LEAD_OWNER_USER_ID) and forwards to the
 * Supabase `inbound-lead` edge function. The browser NEVER sees the secret or
 * the owner id.
 *
 * Required Netlify env vars (Site settings → Environment variables):
 *   SUPABASE_URL             e.g. https://sujyalrzbubvhpkntwja.supabase.co
 *   INBOUND_WEBHOOK_SECRET   same value set in Supabase → Edge Functions → Secrets
 *   LEAD_OWNER_USER_ID       Greg's Supabase auth user UUID (Auth → Users)
 */

// Tiny in-memory rate limiter (per warm instance). Best-effort abuse dampener,
// not a security boundary — the honeypot + required-field checks do the real work.
const HITS = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 8;

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

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { Allow: "POST, OPTIONS" }, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const ip =
    (event.headers &&
      (event.headers["x-nf-client-connection-ip"] ||
        event.headers["x-forwarded-for"] ||
        "")) ||
    "unknown";
  if (rateLimited(ip.split(",")[0].trim())) {
    return json(429, { ok: false, error: "Too many requests" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  // Honeypot: real users leave `company` empty. Silently accept to avoid
  // signalling bots that the trap exists.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return json(200, { ok: true });
  }

  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const arr = (v) =>
    Array.isArray(v)
      ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim())
      : [];

  const first_name = str(body.first_name);
  const last_name = str(body.last_name);
  const email = str(body.email);
  const phone = str(body.phone);
  const address = str(body.property_interest);
  const timeline = str(body.timeline);
  const notes = str(body.notes);

  // Expanded property detail (all optional) — forwarded through to the edge function.
  const appraisal_type = str(body.appraisal_type); // "online" | "in_person"
  const property_type = str(body.property_type);
  const bedrooms = str(body.bedrooms);
  const bathrooms = str(body.bathrooms);
  const car_spaces = str(body.car_spaces);
  const storeys = str(body.storeys);
  const land_size = str(body.land_size);
  const construction = str(body.construction);
  const era = str(body.era);
  const condition = str(body.condition);
  const occupancy = str(body.occupancy);
  const renovations = arr(body.renovations);
  const features = arr(body.features);

  // Required-field validation (mirror the landing page).
  if (!first_name || !last_name) {
    return json(400, { ok: false, error: "Name is required" });
  }
  if (!email && !phone) {
    return json(400, { ok: false, error: "Email or phone is required" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const INBOUND_WEBHOOK_SECRET = process.env.INBOUND_WEBHOOK_SECRET;
  const LEAD_OWNER_USER_ID = process.env.LEAD_OWNER_USER_ID;

  if (!SUPABASE_URL || !INBOUND_WEBHOOK_SECRET || !LEAD_OWNER_USER_ID) {
    console.error("[lead-intake] Missing required env vars");
    return json(500, { ok: false, error: "Server not configured" });
  }

  // Allow-list source; default to the landing page. Instant Form path sends
  // `meta_instant_form`. Never trust an arbitrary client-supplied source.
  const ALLOWED_SOURCES = new Set(["meta_valuation_lp", "meta_instant_form"]);
  const source = ALLOWED_SOURCES.has(str(body.source))
    ? str(body.source)
    : "meta_valuation_lp";

  const payload = {
    owner_user_id: LEAD_OWNER_USER_ID,
    lead_type: "seller", // force deterministic seller classification
    has_seller_lead: true,
    first_name,
    last_name,
    email: email || undefined,
    phone: phone || undefined,
    property_interest: address || undefined, // subject property
    timeline: timeline || undefined,
    notes: notes || undefined, // composed qualification string
    source,
    // Expanded appraisal detail (only sent when present):
    appraisal_type: appraisal_type || undefined,
    property_type: property_type || undefined,
    bedrooms: bedrooms || undefined,
    bathrooms: bathrooms || undefined,
    car_spaces: car_spaces || undefined,
    storeys: storeys || undefined,
    land_size: land_size || undefined,
    construction: construction || undefined,
    era: era || undefined,
    condition: condition || undefined,
    occupancy: occupancy || undefined,
    renovations: renovations.length ? renovations : undefined,
    features: features.length ? features : undefined,
  };

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/inbound-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INBOUND_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("[lead-intake] inbound-lead error", resp.status, detail);
      return json(502, { ok: false, error: "Upstream error" });
    }

    // Never echo the secret or the raw Supabase response to the browser.
    return json(200, { ok: true });
  } catch (err) {
    console.error("[lead-intake] fetch failed", err);
    return json(502, { ok: false, error: "Upstream unreachable" });
  }
};
