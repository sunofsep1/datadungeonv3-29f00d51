# Lead-Gen Funnel Brief — "What's Your Home Worth?" (Seller Appraisal Funnel)

**For:** Cursor (build) + Greg (Meta/ops setup)
**Owner:** Greg Leigh — Queensland Sotheby's International Realty, Redlands QLD
**Date:** 2026-07-16
**Goal:** Build our own version of what iconco.ai runs — a paid-social lead-generation machine that funnels seller/appraisal leads from Instagram & Facebook ads into the DataDungeon CRM, then fires an instant speed-to-lead response and nurture.

Paste this whole file into Cursor and say: *"Read docs/LEAD_GEN_FUNNEL_BRIEF.md and build everything in Part B. Run `npm run verify` for any changes inside the main app; the `lead-funnel/` site is standalone."*

---

## 0. What we're copying (ICON model, decoded)

ICON (iconco.ai) is a done-for-you agency, not software. Their engine, which we are rebuilding ourselves:

1. **Meta (IG/FB) paid ads** with a seller offer — "What's your home worth?" / free appraisal.
2. **Lead capture** — native Meta Instant Form (cheap, high volume) **and** a valuation landing page (higher intent).
3. **Instant qualification** — AI ch/human "setter" contacts within minutes, qualifies timeline + intent.
4. **Appointment booked** into the agent's calendar, with SMS + email confirmation.
5. **Nurture** for the "not yet" leads until they transact.

We already own the CRM plumbing (`inbound-lead` webhook, `send-sms`, `sequence-runner`, `process-workflows`, lead scoring). This project builds the **front of the funnel** (landing page + secure intake proxy) and **wires it to the existing CRM**.

---

## 1. Architecture

```
  Instagram / Facebook paid ad ("What's your home worth?")
        │
        ├─ Path A: Meta Instant Form (in-app, pre-filled)  ──► Zapier/Make ─┐
        │                                                                    │
        └─ Path B: Landing page (lead-funnel site)                           │
                   valuation multi-step form                                 │
                        │ POST (no secret in browser)                        │
                        ▼                                                     │
             Netlify Function: /lead-intake  ◄──────────────────────────────┘
             (holds INBOUND_WEBHOOK_SECRET + LEAD_OWNER_USER_ID server-side)
                        │ Bearer <secret> + owner_user_id
                        ▼
             Supabase Edge Function: inbound-lead  (ALREADY BUILT)
                        │  creates leads row + contacts row
                        │  auto-detects seller intent → contact_category = "seller_lead"
                        ▼
                   DataDungeon CRM
                        │
                        ├─ process-workflows  → speed-to-lead auto-SMS + email (send-sms / send-email)
                        ├─ sequence-runner    → nurture drip for "not yet" leads
                        └─ nightly-lead-score-recompute → prioritises hot leads
```

**Key constraint:** the CRM React app is auth-gated (`ProtectedRoute` → `/login`). The ad landing page **must be a separate public site** — do NOT add it as a route inside the main app. And the `inbound-lead` webhook requires a Bearer secret, so the landing page **must never call it directly** (that leaks the secret). All public POSTs go through the Netlify Function proxy, which injects the secret and owner id server-side.

---

## 2. Repo facts Cursor needs (do not re-derive)

### 2.1 `inbound-lead` webhook contract (already deployed, verify_jwt=false)
`supabase/functions/inbound-lead/index.ts`. POST JSON, `Authorization: Bearer <INBOUND_WEBHOOK_SECRET>`.

Accepted body fields:
| Field | Type | Notes |
|---|---|---|
| `owner_user_id` | uuid **(required)** | Greg's Supabase auth user id. Injected by the proxy, never in the browser. |
| `name` **or** `first_name`+`last_name` | string (one required) | Full name is split automatically. |
| `email` | string | |
| `phone` | string | |
| `source` | string | Defaults to `inbound_webhook`. Use e.g. `meta_valuation_lp`, `meta_instant_form`. |
| `notes` | string | Free text — **the webhook scans this for seller intent.** |
| `property_interest` | string | Also scanned for seller intent; stored on contact. Put the subject property address here. |
| `timeline` | string | e.g. "0-3 months". |
| `budget_min` / `budget_max` | number | Not needed for seller funnel. |
| `lead_type` | string | Set to `seller` to force seller classification. |
| `create_contact` | bool | Default true. Leave default. |

**Seller auto-detection:** the function sets `contact_category = "seller_lead"` if `lead_type` is `seller`, or if any of `has_seller_lead / seller_intent / is_seller_lead / seller_lead_attached` is truthy, or if the words *seller / selling / sell / appraisal / listing my property* appear in `notes`, `property_interest`, `seller_context`, or `selling_intentions`. **For this funnel always send `lead_type: "seller"`** so classification is deterministic.

Response: `201 { ok: true, lead_id, contact_id }`.

### 2.2 CRM automation functions already available (reuse, don't rebuild)
- `send-sms`, `process-scheduled-sms` — outbound SMS.
- `send-email` — outbound email.
- `process-workflows` — CRM workflow engine (pg_cron ~5 min). This is where the speed-to-lead rule lives.
- `sequence-runner` + nurture sequences — the drip.
- `nightly-lead-score-recompute` — scoring.

### 2.3 Brand — use the REAL Queensland Sotheby's palette (NOT the CRM cyan)
Derived from Greg's actual Sotheby's collateral ("Greg's 36 Tips", "Global Reach & Results" bio). The public landing page must look like premium Sotheby's, not the internal CRM.

**Colours (sampled from the brand PDFs):**
- **Sotheby's navy `#172849`** — primary. (Near-black text `#0A0A0A` for body.)
- **Brand gold `#B99A50`** — accent only: thin rules, CTA underline/hover, small flourishes. Use sparingly.
- **Grounds:** soft off-white `#FEFBF5` / light grey `#E2E3E5`. Lots of whitespace.
- CTA button: navy fill, white text, gold on hover — or gold fill for the primary "Get my free appraisal" button. High contrast, premium.

**Type:**
- **Headlines:** an elegant serif in the Sotheby's spirit (their corporate pieces use a refined serif for "Global Reach & Results"). Use a close web serif — e.g. **Cormorant Garamond**, **EB Garamond**, or **Playfair Display** — in navy. This carries the luxury feel.
- **Body / UI:** clean sans — **Source Sans Pro** (already used in Greg's collateral) or system sans.
- **Ad overlays / punchy labels:** **Oswald** (condensed, all-caps) is Greg's collateral heading font — great for ad creative text-on-image, less so for the elegant landing hero.

**Logo — already in `lead-funnel/assets/`** (extracted from Greg's official Sotheby's collateral, transparent background, exact navy `#172849`):
- **`qsir-logo-navy.png`** (2195×339, transparent) — use on off-white / light grounds (header, forms).
- **`qsir-logo-white.png`** (reversed) — use on the navy hero overlay and navy footer.
The lockup is "Queensland" (lighter weight) | vertical divider | "Sotheby's" (serif) with "INTERNATIONAL REALTY" small caps beneath. **Use these files as-is — never recreate, recolour, or distort.** These are high-res raster; if Greg later supplies the official **SVG/EPS**, swap them in for infinite crispness (keep the same filenames or update references).

### 2.5 Config values (confirmed — for the Netlify Function proxy env)
- `LEAD_OWNER_USER_ID = e1bd63ad-b120-4a5a-91c0-c3189bc8938c` (Greg's live CRM account — owns all 694 contacts; the Proton account is empty, do not use it).
- `AGENT_ALERT_MOBILE` = Greg's mobile for lead alerts (E.164/AU, e.g. `+61…`) — Greg supplies.
- `SUPABASE_URL` + `INBOUND_WEBHOOK_SECRET` = from Supabase (project ref `sujyalrzbubvhpkntwja`); the secret is already set on the `inbound-lead` function.

Overall feel: generous whitespace, one strong hero image, serif navy headlines, gold hairline accents, off-white ground — quiet luxury. This premium look is itself a trust signal for seller leads.

### 2.4 Deploy pattern
Main CRM deploys from this repo to Netlify (`netlify.toml`, publish `dist`). The landing page is a **second, standalone Netlify site** with its base directory set to `lead-funnel/`. Keep it out of the SPA redirect.

---

## PART A — Non-code setup (Greg does these in Meta/Supabase)

These don't need Cursor; they're the ops checklist so the build has somewhere to point.

1. **Instagram → connect to a Facebook Page.** Instant Forms and Ads Manager require a linked FB Page and a Meta Business Suite / Business Manager account. (You have IG business; create the FB Page + Business Manager, link them.)
2. **Meta Pixel / Conversions API** — create a Pixel in Events Manager; you'll paste its ID into the landing page (Part B, Task 1).
3. **Housing Special Ad Category** — real-estate lead ads must be flagged as **Housing** in Ads Manager. This restricts targeting: no age/gender narrowing and a broadened location radius (min 15 mi/24 km around a pin). Plan creative accordingly.
4. **Find your `owner_user_id`** — Supabase Dashboard → Authentication → Users → your account → copy the UUID. Give it to the proxy as env `LEAD_OWNER_USER_ID`.
5. **`INBOUND_WEBHOOK_SECRET`** — confirm it's set in Supabase → Edge Functions → Secrets (the `inbound-lead` function reads it). Use the same value as the proxy env.
6. **Zapier or Make account** for the Instant Form path (Part B, Task 4 gives the mapping).
7. **Booking link** — decide the appointment CTA (your Google Calendar booking page or a Calendly-style link) to drop into the SMS auto-reply and thank-you page.

---

## PART B — Build tasks (Cursor)

Create a new standalone directory `lead-funnel/` (its own Netlify site). File tree:

```
lead-funnel/
  index.html            # valuation landing page (multi-step)
  thankyou.html         # confirmation page + booking CTA + Pixel "Lead" event
  assets/
    styles.css
    funnel.js           # step logic + submit → /.netlify/functions/lead-intake
  netlify/functions/
    lead-intake.js      # secure proxy → Supabase inbound-lead
  netlify.toml          # build/publish + function config
  README.md             # env vars + deploy notes
```

### Task 1 — Landing page (`index.html` + `assets/`)
A premium, fast, mobile-first single page. Structure:

- **Branding — personal-brand led, Sotheby's as trust badge (franchise-cleared).** The hero is **Greg**, not the corporate logo: a real photo of Greg + "Greg Leigh — your local Redlands property specialist." Queensland Sotheby's International Realty appears as a **credibility badge/byline** (small logo + "with Queensland Sotheby's International Realty"), not the headline. A human face out-converts a corporate logo on social; the brand supplies the trust. Keep the Sotheby's badge within brand guidelines (correct logo lockup, colours, no distortion).
- **Hero:** headline **"What's your home worth in [suburb]?"** (default "the Redlands"), subhead "Get a free, no-obligation appraisal from Greg Leigh, your local Redlands specialist — with Queensland Sotheby's International Realty." Hero image = Greg (piece-to-camera still or professional headshot on location). Primary CTA button (gold) "Get my free appraisal" scrolls to / opens the form.
- **Trust strip:** Greg's name + photo, "Local Redlands specialist", Sotheby's badge, a recent-sale or suburb stat.
- **Multi-step form (the conversion core — build as a 4-step wizard, one question per screen, progress bar):**
  1. **Property address** (Google Places autocomplete if `VITE_GOOGLE_MAPS_API_KEY` available; plain text fallback). → maps to `property_interest`.
  2. **Timeline:** "When are you thinking of selling?" buttons: *Ready now · 0–3 months · 3–6 months · 6–12 months · Just curious.* → maps to `timeline`.
  3. **Property type / beds** (optional, one screen): house/unit/land + bedrooms. Append to `notes`.
  4. **Contact:** first name, last name, email, mobile. → `first_name`, `last_name`, `email`, `phone`.
- **Submit** → POST JSON to `/.netlify/functions/lead-intake` (see Task 3 for payload). On success redirect to `thankyou.html`. On error show inline retry.
- **Copy tone:** confident, local, low-pressure. Emphasise "free", "no obligation", "local expert", "takes 30 seconds".
- **Performance:** inline critical CSS, one optimised hero image, no heavy framework — vanilla JS is fine and keeps Meta's landing-page load-time quality high. Lighthouse mobile ≥ 90.
- **Pixel:** paste Meta Pixel base code in `<head>`; fire `InitiateCheckout` when the form starts (step 1 interaction). (The `Lead` event fires on the thank-you page.)
- **Compliance footer:** privacy link, agency name/licence, "By submitting you agree to be contacted about your appraisal."

Qualification questions map so the CRM gets rich context. Compose `notes` server-side or client-side as, e.g.:
`"Valuation LP | Timeline: 0-3 months | Type: House 4bed | Address: 12 Example St, Cleveland"`.

### Task 2 — Thank-you page (`thankyou.html`)
- Confirms submission, sets expectation ("[Agent] will text/call you shortly").
- Prominent **"Book your appraisal now"** button → the booking link (Part A #7) for instant self-booking (higher conversion than waiting for callback).
- Fires Meta Pixel **`Lead`** standard event on load (this is the conversion Meta optimises toward).

### Task 3 — Secure intake proxy (`netlify/functions/lead-intake.js`)
Node Netlify Function. Responsibilities:
- Accept POST from the landing page (same-origin). Reject non-POST.
- **Basic anti-abuse:** honeypot field check + simple rate limit / required-field validation. (Optionally hCaptcha later.)
- Build the `inbound-lead` payload, **injecting server-side secrets**:
  ```js
  const payload = {
    owner_user_id: process.env.LEAD_OWNER_USER_ID,
    lead_type: "seller",              // force seller classification
    first_name, last_name, email, phone,
    property_interest: address,        // subject property
    timeline,
    notes,                             // composed qualification string
    source: body.source || "meta_valuation_lp",
    has_seller_lead: true,
  };
  await fetch(`${process.env.SUPABASE_URL}/functions/v1/inbound-lead`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.INBOUND_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify(payload),
  });
  ```
- Return `{ ok: true }` (never echo the secret or the raw Supabase response).
- **Env vars** (Netlify site settings): `SUPABASE_URL`, `INBOUND_WEBHOOK_SECRET`, `LEAD_OWNER_USER_ID`.

### Task 4 — Instant Form path (documented, no landing page needed)
Meta Instant Forms submit inside FB/IG. Connect them to the same proxy via Zapier/Make:
- Trigger: **Facebook Lead Ads → New Lead**.
- Action: **Webhooks → POST** to `https://<lead-funnel-site>/.netlify/functions/lead-intake` with body:
  `{ "first_name","last_name","email","phone","property_interest": <address field>, "timeline": <timeline field>, "source": "meta_instant_form", "notes": <composed> }`.
- The proxy adds `owner_user_id` + secret + `lead_type: seller`, so both paths converge identically.
- Include the same Instant Form qualifying questions as the landing page (address + timeline) so lead quality is comparable.

### Task 5 — `netlify.toml` + `README.md`
- `netlify.toml`: `publish = "."`, `functions = "netlify/functions"`, and **no** SPA catch-all redirect (this is a static multi-page site).
- `README.md`: list the three env vars, how to find `LEAD_OWNER_USER_ID`, and the deploy steps (new Netlify site, base dir `lead-funnel/`).

### Task 6 — CRM speed-to-lead + nurture + agent alert (config, partially present)
This lives in the **main app**, not `lead-funnel/`. SMS provider is **Mobile Message** (`_shared/smsCore.ts` → `mobileMessageCredsFromEnv` / `postMobileMessageBatch`; Twilio is fallback only) — reuse it, no new provider. In `src/lib/notificationRules.ts` / the Automations UI / `process-workflows`, add/confirm a workflow.

**Trigger:** new contact with `contact_category = "seller_lead"` from source starting `meta_`.

**Greg's chosen behaviour (build exactly this):**
- **Action 1 — Alert Greg instantly (SMS to his own mobile via Mobile Message).** On new `meta_` seller lead, send an SMS to Greg's number (env/setting `AGENT_ALERT_MOBILE`), e.g. *"🔔 New appraisal lead: {first_name} {last_name}, {address}, timeline {timeline}. Ph {phone}. Approve reply in CRM."* This is the notification he wants — a text to his phone the moment a lead lands.
- **Action 2 — Draft the lead reply for approval (do NOT auto-send).** Create a **pending/draft outbound SMS** to the lead (status `draft`/`pending_approval`, not sent) pre-written as: *"Hi {first_name}, it's Greg from Queensland Sotheby's — thanks for requesting an appraisal on {address}. I can pop round this week; what suits? Or book here: {booking_link}"*. Greg reviews and one-taps send from the CRM (or replies to the alert). **Make approval one-tap and surface it top of Hot Leads / notifications** so the 5-minute window is still achievable — the whole point of speed-to-lead is lost if approval takes hours. If a draft/approval SMS state doesn't already exist, add the minimal state + a one-tap "Send" affordance; reuse the existing `send-sms` path on approval.
- **Action 3 — Email backup (optional, `send-email`):** same content to the lead, or an internal copy to Greg as a paper trail.
- **Action 4 — Nurture enrol (`sequence-runner`):** anyone with timeline > 3 months or who doesn't book → weekly value touch (recent sales, suburb median) until they book or opt out.
- Confirm `nightly-lead-score-recompute` surfaces these in Hot Leads.

> **Tradeoff note for Greg:** you chose *draft-for-approval* over auto-send. That protects the personal/brand touch but risks the 5-minute speed-to-lead window (leads contacted <5 min are ~21x more likely to qualify). Mitigation built in: instant SMS alert to your phone + one-tap approve. If you ever want to flip a lead straight to auto-send, it's a one-line change in this workflow.

Before writing new code, check whether an existing workflow/sequence already covers seller leads (search `src/lib/nurtureAutoEnroll.ts`, `src/lib/leadCategoryService.ts`, Automations page, and any existing draft-SMS/approval state). Extend rather than duplicate. Run `npm run verify` after any main-app change.

---

## 3. Field mapping (single source of truth)

| Funnel field | Proxy → inbound-lead | CRM result |
|---|---|---|
| Property address | `property_interest` | contact `property_requirements.summary`; scanned for seller intent |
| Timeline | `timeline` | lead/contact `timeline` |
| First / last name | `first_name` / `last_name` | contact name |
| Email / mobile | `email` / `phone` | contact email/phone |
| (forced) | `lead_type: "seller"`, `has_seller_lead: true` | `contact_category = "seller_lead"` |
| Source | `source: meta_valuation_lp` \| `meta_instant_form` | lead/contact `source` (channel attribution) |
| Composed context | `notes` | contact notes + seller-intent scan |

---

## 4. Verification / definition of done

- Landing page passes Lighthouse mobile ≥ 90; form works on iOS Safari + Android Chrome.
- A test submission to `/.netlify/functions/lead-intake` creates **a lead + a contact** in DataDungeon with `contact_category = "seller_lead"` and correct source. (Check with a throwaway name.)
- Secret + `owner_user_id` appear **only** in Netlify function env, never in page source or network payload from the browser.
- Instant Form → Zapier → proxy creates an identical contact with `source = meta_instant_form`.
- Speed-to-lead SMS fires on a test seller lead (or is queued by `process-workflows`).
- `npm run verify` passes for any changes inside the main app.

---

## 5. Market research baked into the plan (why it's built this way)

- **Offer:** "What's your home worth?" seller/valuation offers deliver the **lowest cost-per-lead** of any real-estate offer (global ~$15–$35/lead; AU vendor-lead average ~$48 AUD per Rex Software's sample of 152 AU agent accounts). That's why this is the first funnel.
- **Both capture paths:** Meta Instant Forms are 30–50% cheaper and higher-volume but low intent (~2% to appointment); landing-page leads cost 3–5x more but convert ~17% to appointment. Running **both in parallel** produced ~60% lower blended CPL and ~125% more volume than website-only. Hence Path A + Path B converging on one proxy.
- **Speed-to-lead is decisive:** leads contacted within 5 min are ~21x more likely to qualify than after 30 min; the fastest responder wins 35–50% of deals. Hence the instant auto-SMS in Task 6 is non-negotiable.
- **Multi-step form** (one question per screen) lifts completion vs a single long form and captures the qualifying data (address + timeline) that makes the CRM's seller detection and nurture routing work.
- **Compliance:** Housing Special Ad Category is mandatory and limits targeting — build broad-radius, interest/lookalike-light campaigns and lean on strong creative + offer rather than tight demographic targeting.

### Suggested starting budget & benchmarks (AU, tune after 2 weeks)
| Metric | Planning number |
|---|---|
| Test budget | AUD $30–50/day for 2–3 weeks per campaign |
| Expected CPL (valuation) | ~$15–$50 AUD (seasonal; cheaper ~Nov, dearer ~Jan) |
| Instant Form CPL | often 30–50% below landing-page CPL |
| Lead → appraisal (landing page) | aim 10–17% with fast follow-up |
| First response time | **< 5 minutes**, automated |

### Ad creative starters (Redlands seller angle — personal-brand led, Sotheby's badge; franchise-cleared)
Lead with Greg on camera/in-frame; Sotheby's appears as a badge, not the hook.
- "Hi, I'm Greg — your local Redlands agent. Curious what your home's worth in today's market? I'll do a free, no-obligation appraisal." (Sotheby's badge in-frame/end card.)
- "Thinking of selling in Cleveland / Wellington Point / Ormiston? I'm Greg Leigh, a local specialist with Queensland Sotheby's International Realty — get your home's current value in 30 seconds."
- **Best format:** 20–30s vertical video (9:16 for Reels/Stories), Greg piece-to-camera at a local landmark (Cleveland Point), ending on "What's your home worth?" + booking CTA. Personal video is the highest-converting unit here.
- Static fallback: strong photo of Greg on location + headline overlay + small Sotheby's lockup.
- Keep the Sotheby's logo lockup/colours within brand guidelines on every asset.

---

## 6. Build-tool recommendation

- **`lead-funnel/` (landing page + proxy + Zapier mapping):** self-contained, vanilla, no CRM coupling → **either tool works; Cursor is a good fit** since it's a clean new directory and you're comfortable there.
- **Task 6 (CRM workflow/nurture):** touches the live app and DB. Do this **inside the main repo with `npm run verify`** — Cursor with full-repo context is ideal, or hand it back to Claude here which can run the build to catch errors. Keep this change small and reuse existing automation rather than adding new tables.

---

## 7. Sources
- ICON: https://iconco.ai/ and https://icon-conversa.ai/
- Meta ads for real estate 2026: https://mavenxvisuals.com/blog/meta-ads-real-estate-agents-guide-2026.html · https://stape.io/blog/real-estate-facebook-ads · https://growwithsakib.com/meta-lead-ads/
- Instant Form vs landing page conversion: https://leads-estate.com/en/blog/facebook-lead-forms-vs-landing-page-real-estate · https://www.jamilacademy.com/blog/real-estate-landing-pages-that-convert
- AU cost-per-lead: https://www.rexsoftware.com/articles/facebook-ad-benchmarks-for-real-estate-in-australia · https://www.jamilacademy.com/blog/real-estate-lead-generation-costs · https://www.adamigo.ai/blog/meta-ads-cost-per-lead-benchmarks-industry-2026
- Speed-to-lead + qualification: https://getperspective.ai/blog/real-estate-texting-software-2026-8-tools-compared-speed-to-lead · https://www.crescendo.ai/blog/best-real-estate-chatbots-with-ai
