# Handover Brief — Seller Lead Engine + ICON Replication

**From:** Greg (via Cowork session) · **To:** Claude working in the DataDungeon repo
**Date:** 16 July 2026 · **Project:** Build an owned lead-generation + appointment-setting engine on top of DataDungeon

---

## 0. TL;DR for the receiving Claude

Greg is a real estate agent contracting to **Sotheby's International Realty (QLD)**. He owns **DataDungeon**, a single-agent real estate CRM (React/Vite + Supabase, live on Netlify). We are building two connected growth engines *inside DataDungeon* instead of paying an agency:

1. **INBOUND** — Facebook/Instagram lead ads → home-valuation funnel → CRM → instant follow-up → nurture. (Researched and scoped — see §2.)
2. **OUTBOUND** — an "AI appointment-setting" engine modelled on **ICON (iconco.ai)**, a premium AU/NZ agency Greg wants to replicate rather than pay for. (Teardown + replication plan in §4.)

Your job continuing this: help build the technical pieces on the existing stack. Nothing here needs a third-party platform we can't self-host or cheaply glue in. **Read `CLAUDE.md` in the repo root first** — it has the architecture, commands, and the exact edge functions referenced below.

---

## 1. What already exists in DataDungeon (our building blocks)

Pulled from the repo `CLAUDE.md`. These are the pieces both engines lean on:

| Piece | Location / name | Role |
|---|---|---|
| Public lead receiver | `inbound-lead` edge function (public webhook, no JWT verify) | Endpoint for Meta lead ads + website form submissions |
| AU valuation source | `pricefinder-proxy` edge function | Powers instant home-value estimates |
| Workflow engine | `process-workflows` (Deno, runs via pg_cron ~5 min) | Fires instant SMS/email + routing rules |
| Nurture | `nurtureAutoEnroll.ts` + `sequence-runner` | Long-term drip sequences |
| Lead logic | `leadCategoryService.ts`, `contactUrgency.ts` | Category + urgency scoring |
| SMS | existing SMS domain (per CLAUDE.md table stakes) | Outbound text |
| Data | Supabase, ~50+ tables, RLS user-scoped (`user_id = auth.uid()`) | All contact/lead storage |
| Frontend | React 18 + Vite, lazy routes, TanStack Query, shadcn/Radix, Zoho-inspired dark theme (`#00BCD4`) | Where landing pages / dashboards get built |

**Key constraint:** single-agent app, not multi-tenant SaaS. Everything is user-scoped. Local + prod hit the **same** Supabase project. TypeScript is `strict:false`.

---

## 2. INBOUND engine — status & next steps

**Already done (this session):** full research + an interactive strategy dashboard at
`/Users/gregzee/datadungeon/seller-lead-engine.html` (open it — 8 tabs, ROI calculator, 90-day checklist). Benchmarks: AU real-estate CPL ~$26 (vendor leads ~$30–49), lead-ad conversion ~9.7%, 5-min response = 21× qualification lift.

**The funnel we're building:**
`Meta lead ad → webhook → inbound-lead → contacts → process-workflows (instant SMS+email) → nurtureAutoEnroll`

### Build tasks (in order — do NOT run ads before #1 works)

1. **Instant-reply automation.** In `process-workflows`, add a rule: on new contact with `source = 'facebook-valuation'`, send an SMS + email within seconds. ⚠️ The cron runs ~5 min — for the *first* touch we want genuinely instant, so consider a **webhook-triggered send** on insert (Supabase DB webhook or trigger → edge function) rather than waiting for the cron tick. This single feature is the highest-leverage thing in the whole project.

2. **Meta → CRM bridge.** Meta's webhook sends a `leadgen_id`; you must call the Graph API to fetch field data. Two options:
   - **Option B (ship first):** Zapier "Facebook Lead Ads" trigger → POST clean JSON to `inbound-lead`. Live in an hour, ~$20–30/mo.
   - **Option A (own it):** new `meta-lead-webhook` edge function that verifies Meta's signature, reads `leadgen_id`, calls Graph API for fields, inserts contact. $0/mo. Swap to this once volume justifies.

3. **Pricefinder valuation landing page.** New Netlify route `/home-value`. Address autocomplete (repo already has `VITE_GOOGLE_MAPS_API_KEY`) → call `pricefinder-proxy` → show an **estimate range** (not a precise figure — AVM honesty) → gate the detail behind name/email/phone → write to `contacts` (`source: 'website-valuation'`) → trigger the same instant-reply workflow. A/B test this against Meta Instant Forms.

4. **Compliance plumbing.** Consent copy on the form covering **email AND SMS** (consent is channel-specific under the Spam Act). Sender identification in every message. Working unsubscribe / "reply STOP" that DataDungeon honours (flag + suppress). Privacy policy link. Flag Meta ads as **Housing Special Ad Category** (restricts targeting to broad location — lean on creative/message instead).

5. **Source→outcome tracking.** Tag every lead so we can measure cost per *appraisal* and per *listing*, not just per lead. Use existing lead category / saved views.

---

## 3. Reality check to keep in the build

Facebook seller leads are **top-of-funnel** (0.4–2.5% baseline conversion to listing). This is a **volume + patience + nurture** play — capture cheaply, follow up in minutes, nurture 6–24 months. First 90 days ≈ many leads, a few appraisals, 0–1 listings, with the real payoff maturing later. Build for the database, not for next week.

---

## 4. OUTBOUND engine — ICON (iconco.ai) teardown + replication

Greg wants to replicate what ICON sells (expensive, one-off fee) rather than pay them. This is legitimate competitive analysis: we're reverse-engineering a **service/business model**, not their code or IP. Everything ICON does is assembled from commodity building blocks — the value is in the orchestration and the human-in-the-loop, both of which we can rebuild.

### 4.1 What ICON actually sells (from their site copy)

Positioning: *"Where human expertise meets AI precision."* Their five stated pillars:

1. **Built by experts, powered by AI** — strategists design the system, AI executes at scale, "first touchpoint → booked appointment without you lifting a finger."
2. **Intelligent multi-channel outreach** — AI handles reach + timing across **SMS, email, and voice**; humans craft messaging + refine targeting.
3. **Pre-qualified calendar bookings** — AI qualifies at scale, a human team verifies intent; only genuinely-ready prospects reach your calendar.
4. **Dedicated revenue partner** — a senior strategist (not a bot, not a call centre) oversees the system daily, interprets data, directs the AI.
5. **One investment, compounding returns** — no monthly retainer / lock-in; one-off build fee, results compound.

**In plain terms:** ICON is an **AI-driven outbound appointment-setting agency**. They take a client's target list, run automated multi-channel outreach that feels personal, use AI to qualify replies, have a human confirm intent, and drop pre-qualified appointments on the client's calendar — with a senior human steering it.

### 4.2 How the market builds this (the commodity stack)

Every "AI appointment setter" in 2025–26 is the same anatomy — this is what sits under ICON's polish:

- **Data / targeting** — a source of ideal prospects (list building / enrichment; e.g. Apollo, or in real estate: owner/vendor lists).
- **Multi-channel sequencer** — sends SMS + email + voice in one adaptive sequence, timing/branching by reply. (Reply.io, Lindy, Instantly-style tools do email; Twilio/Retell/Voiceflow do SMS+voice.)
- **AI qualification** — an LLM (or voice agent) reads/handles replies, detects intent, answers objections, asks qualifying questions. Speed matters: leaders contact inbound replies in ~10 seconds and report 15–52% lead-to-booking.
- **Human verification** — a person confirms the AI-qualified appointment is real (ICON's "verified by both").
- **Calendar booking + CRM write-back** — on a "yes," create the calendar event, send SMS/email confirmation, log everything to CRM via API/webhook.
- **A steering human** — the "dedicated strategist" who reads the numbers and tunes messaging/targeting.

Off-the-shelf equivalents run **$97–$300/mo** for the software layer. ICON charges a premium because they wrap it in done-for-you strategy + human QA + brand. **The moat is service and trust, not technology.**

### 4.3 Replication plan on DataDungeon

We already own most of the stack. Mapping:

| ICON capability | Replicate with |
|---|---|
| Lead receiver / CRM | ✅ `inbound-lead` + `contacts` tables |
| Multi-channel sequencer | ✅ `sequence-runner` + `process-workflows` (extend to branch on reply) |
| SMS outbound | ✅ existing SMS domain |
| Email outbound | Add transactional/marketing email (edge function + provider) |
| AI qualification of replies | New edge function calling an LLM: classify reply intent (interested / not / question / book-now), draft next message, set lead category/urgency |
| AI voice | Optional later — Twilio + a voice agent (Retell/Voiceflow-style) if we want the phone channel |
| Calendar booking | Repo already has a `google-calendar` OAuth+sync edge function → auto-create events |
| Human verification + steering | **Greg** (this is the "dedicated strategist" — keep a human in the loop before an appointment is confirmed) |
| Compliance | Same Spam Act / DNCR / consent rules as §2.4 — **stricter for OUTBOUND cold contact** (see below) |

**Suggested build order for OUTBOUND (phase 2, after inbound is live):**
1. Reply-intent classifier edge function (LLM) — the brain. Feed it inbound SMS/email replies, output intent + suggested reply + urgency.
2. Extend `sequence-runner` to branch on classifier output (adaptive, not linear).
3. Wire booked "yes" → `google-calendar` event + confirmation SMS/email + CRM stamp.
4. Add email channel if not already outbound-capable.
5. (Optional) voice channel via Twilio + voice agent.
6. Keep Greg as the human verifier on the final step — matches ICON's model and de-risks compliance.

### 4.4 ⚠️ Compliance is different (and harder) for OUTBOUND

Inbound leads gave consent by filling a form. **Cold outbound has NOT.** Under the Australian Spam Act + Do Not Call Register:
- Cold marketing **SMS/email needs consent** (express or reasonably inferred) — sending unsolicited commercial messages at scale is exactly what ACMA fines (up to **$220k single / $2.1M repeat**).
- Cold **phone/voice** to numbers on the **DNCR** is prohibited without an exemption.
- This is the real reason ICON's model is delicate — **do not** replicate blind cold-blasting. Safer replication paths: contact people with an existing relationship/inferred consent (past enquiries, expired listings, your own database, referrals), or make the "outreach" consented lead-nurture rather than cold spam. **Flag this to Greg and get consent sources sorted before any outbound send.** (General info, not legal advice — confirm with someone qualified / current ACMA guidance.)

---

## 5. Open questions for Greg / to resolve

1. **Outbound data source & consent** — where do outbound target lists come from, and can we establish consent/inferred consent? (Gates all of §4.)
2. **Email sending** — is DataDungeon already able to send marketing/transactional email, or do we add a provider?
3. **Budget for the bridge** — start on Zapier ($20–30/mo) or go straight to the native `meta-lead-webhook`?
4. **Voice channel** — do we want AI voice in scope, or SMS+email only to start?
5. **Which suburb(s)/offer** to launch the first inbound valuation campaign on.

---

## 6. Definition of done for the next work session

- [ ] Instant-reply SMS+email fires within seconds of a test lead hitting `inbound-lead`.
- [ ] A real Facebook test lead lands in `contacts` tagged `facebook-valuation`.
- [ ] Consent + unsubscribe wording drafted and wired.
- [ ] `/home-value` landing page scoped (or built) against `pricefinder-proxy`.
- [ ] Outbound consent-source question answered before any §4 build starts.

*Reference the interactive dashboard (`seller-lead-engine.html`) for the full inbound rationale, benchmarks, and the ROI calculator. This brief is the technical continuation plan.*
