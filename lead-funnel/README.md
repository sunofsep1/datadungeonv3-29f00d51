# Lead Funnel — "What's Your Home Worth?" (Seller Appraisal)

Standalone, public, static landing-page funnel for Queensland Sotheby's
International Realty (Greg Leigh, Redlands QLD). It captures seller/appraisal
leads from Meta (Instagram/Facebook) ads and forwards them — securely — into the
DataDungeon CRM via the existing `inbound-lead` Supabase edge function.

> **This is a SEPARATE Netlify site from the main CRM app.** It is *not* a route
> inside the auth-gated React app. Keep it that way — the CRM is `ProtectedRoute`
> gated; ad traffic must land on a fast public page.

## What's here

```
lead-funnel/
  index.html                     # multi-step valuation landing page (4-step wizard)
  thankyou.html                  # confirmation + booking CTA + Pixel "Lead" event
  assets/
    styles.css                   # Sotheby's brand styling
    funnel.js                    # step logic + submit → the proxy
    qsir-logo-navy.png           # official navy lockup (light grounds)
    qsir-logo-white.png          # official white/reversed lockup (navy grounds)
  netlify/functions/
    lead-intake.js               # secure proxy → Supabase inbound-lead
  netlify.toml                   # publish "." + functions dir, no SPA redirect
  README.md                      # this file
```

## How it works

```
Meta ad → landing page (index.html)
            │  POST JSON (NO secret in the browser)
            ▼
   /.netlify/functions/lead-intake   ← injects INBOUND_WEBHOOK_SECRET + LEAD_OWNER_USER_ID
            │  Authorization: Bearer <secret>, owner_user_id, lead_type:"seller"
            ▼
   Supabase edge function: inbound-lead  → creates lead + contact (contact_category = "seller_lead")
            ▼
   DataDungeon CRM  → agent SMS alert + draft reply + nurture (see main app, Task 6)
```

The landing page **never** calls Supabase directly — that would leak the webhook
secret. All public POSTs go through the Netlify Function, which holds the secret
and the owner id server-side.

## Environment variables (Netlify → Site settings → Environment variables)

| Var | Value | Where to get it |
|---|---|---|
| `SUPABASE_URL` | `https://sujyalrzbubvhpkntwja.supabase.co` | Supabase → Project Settings → API |
| `INBOUND_WEBHOOK_SECRET` | the long random string | Supabase → Edge Functions → Secrets (same value the `inbound-lead` function reads) |
| `LEAD_OWNER_USER_ID` | Greg's auth user UUID | Supabase → Authentication → Users → your account → copy the UUID |

**These three live only in the Netlify function environment.** They must never
appear in `index.html`, `thankyou.html`, `funnel.js`, page source, or any browser
network payload. (Verify: open DevTools → Network → the POST to `/lead-intake` —
the body has no secret and no owner id; those are added server-side.)

### Also replace these in-page placeholders before going live

These are static tokens in the HTML (not secrets — safe for the browser):

- `__META_PIXEL_ID__` — in `index.html` **and** `thankyou.html` `<head>`. Your
  Meta Pixel ID from Events Manager (Part A #2).
- `__BOOKING_LINK__` — in `thankyou.html`. Greg's Google Calendar / Calendly
  booking page (Part A #7).
- `__GOOGLE_MAPS_API_KEY__` — in `index.html` (optional; the address field works
  as plain text without it). Uncomment the Maps `<script>` tag and set the key to
  enable Google Places address autocomplete.

## Brand assets

The official Queensland Sotheby's lockups are in place (high-res transparent
PNG) and used as-is — never recreate, recolour, or distort them:

- `assets/qsir-logo-navy.png` — navy lockup, used on light grounds (header, forms, trust badge).
- `assets/qsir-logo-white.png` — white/reversed lockup, used on the navy hero + footer.

(If a logo file is ever removed, the page falls back to a clearly-marked text
placeholder via an `onerror` handler so nothing breaks.)

Still to add (optional but recommended for conversion — the hero is personal-brand led):

- `assets/greg-hero.jpg` — Greg on location (Cleveland Point etc.), used as the hero background. Falls back to solid navy if absent.
- `assets/greg-avatar.jpg` — round headshot for the trust strip (hidden if absent).

SVG preferred for logos; high-res transparent PNG acceptable. Keep filenames the
same and no code changes are needed.

## Local development

```sh
# From this directory, with the Netlify CLI:
npm i -g netlify-cli
netlify dev            # serves the static site + the lead-intake function locally
```

Set the three env vars locally (e.g. a `.env` in this dir that `netlify dev`
reads, or `netlify env:import`). Then submit the form and confirm a lead + contact
appear in the CRM with `contact_category = "seller_lead"` and `source = meta_valuation_lp`.

Without the Netlify CLI you can open `index.html` directly to preview layout, but
the form submit needs the function runtime.

## Deploy — as a second Netlify site

1. **New site** in Netlify: *Add new site → Import an existing project* → pick this repo.
2. **Base directory:** `lead-funnel/`  ·  **Publish directory:** `lead-funnel/` (i.e. `.` relative to base)  ·  **Functions directory:** `lead-funnel/netlify/functions`  ·  **Build command:** *(leave empty)*.
   (`netlify.toml` in this folder already sets `publish = "."` and `functions = "netlify/functions"`; when the base dir is `lead-funnel/`, these resolve correctly.)
3. **Environment variables:** add `SUPABASE_URL`, `INBOUND_WEBHOOK_SECRET`, `LEAD_OWNER_USER_ID` (table above).
4. **Deploy.** Note the site URL (e.g. `https://<name>.netlify.app`).
5. **Smoke test:** submit a throwaway lead; confirm a lead + contact land in the CRM
   as a `seller_lead`, and that the browser POST body contains no secret / owner id.

> The main CRM app deploys from a different Netlify site (publish `dist`). Keep the
> two sites separate. This funnel has no build step and no SPA redirect.

## Instant Form path (Meta Lead Ads → Zapier/Make)

Meta Instant Forms submit inside FB/IG. Route them to the **same proxy** so both
capture paths converge identically:

- **Trigger:** Facebook Lead Ads → New Lead.
- **Action:** Webhooks → POST to `https://<this-site>/.netlify/functions/lead-intake` with body:
  ```json
  {
    "first_name": "<first name field>",
    "last_name":  "<last name field>",
    "email":      "<email field>",
    "phone":      "<phone field>",
    "property_interest": "<address field>",
    "timeline":   "<timeline field>",
    "notes":      "Meta Instant Form | Timeline: <timeline> | Address: <address>",
    "source":     "meta_instant_form"
  }
  ```
- The proxy adds `owner_user_id`, the secret, and `lead_type: "seller"`, so Instant
  Form and landing-page leads are classified identically.
- Use the same qualifying questions (address + timeline) in the Instant Form so
  lead quality is comparable across paths.

## Security notes

- The proxy rejects non-POST, validates required fields, checks a honeypot
  (`company` field), and applies a best-effort per-instance rate limit.
- The proxy allow-lists `source` to `meta_valuation_lp` / `meta_instant_form`.
- The proxy returns only `{ ok: true }` — it never echoes the secret or the raw
  Supabase response.
