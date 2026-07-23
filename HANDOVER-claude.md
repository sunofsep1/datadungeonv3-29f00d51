# DataDungeon CRM — Project Handover

**Project Owner:** Greg Leigh, Queensland Sotheby's International Realty (Redlands)  
**Current Date:** 16 July 2026  
**Status:** Seller lead inbound engine LIVE and deployed

---

### ⚠️ IMPORTANT: Read CORRECTED-STATUS-2026-07-16.md First
This handover was partially superseded by corrections discovered after verification against live prod. **Read `CORRECTED-STATUS-2026-07-16.md` first** — it covers the two-repo situation, RLS migration reconciliation, and clarifies what's actually v72 vs. v70. Then come back here.

---

## Quick Facts

- **Repo:** `/Users/gregleigh/datadungeon-1` (GitHub: feat/lead-gen-seller-funnel branch)
- **Live App:** https://tiny-brioche-b979f7.netlify.app
- **Supabase Project:** `sujyalrzbubvhpkntwja` (same project local + prod)
- **What it is:** Single-agent real estate CRM (React/Vite + Supabase). User-scoped (all data filtered by `user_id = auth.uid()`)

---

## What's Actually Running (Verified Against Prod)

### ⚠️ CORRECTION (from CORRECTED-STATUS-2026-07-16.md)

**Production is v72, not v70.** The home Mac has the latest source. This handover was written before the final push.

### 1. **inbound-lead v72** ✅
   - **File:** `supabase/functions/inbound-lead/index.ts`
   - **SMS ack:** "Hi [name], thanks for requesting a property appraisal — it's Greg Leigh from Queensland Sotheby's International Realty. I'll be in touch shortly to arrange a time. Reply STOP to opt out."
   - **EMAIL ack:** Branded QSIR template via **Resend** (using existing `RESEND_API_KEY`)
   - **Both logged to:** `interactions` table (audit trail)
   - **Bug fixes:**
     - Mobile Message status checking now accepts `success/sent/queued/delivered/ok`
     - Improved error logging: captures nested Mobile Message error details
   - **Deployed:** ✅ Live on `sujyalrzbubvhpkntwja`
   - **Important:** Email delivery requires `EMAIL_FROM` to be a **verified Resend domain** (onboarding@resend.dev fallback only reaches account owner)

### 2. **send-instant-reply** ⏸️ DORMANT
   - **Status:** Deployed but **DO NOT enable the DB webhook**
   - **Why:** v72 consolidated instant reply into `inbound-lead`. A second webhook would run a competing path and double-text prospects
   - **Leave it off** unless there's a specific use case for a separate instant-reply flow

### 3. **RLS Security Migration** ✅ (with caveats)
   - **Status:** Enabled on 9 tables, but **two different migrations exist** with conflicting styles
   - **Work-Claude's migration:** `20260716083118_enable_rls_on_protected_tables.sql` (auth.uid style)
   - **Home-Mac's migration:** `enable_rls_authenticated_on_nine_exposed_tables` (authenticated style)
   - **Action needed:** Reconcile these so the migration history is clean (don't disable, just align to one policy style)
   - **Prod status:** Secured ✅ (don't disable anything)
   - **Affected tables:** `pipelines, pipeline_stages, workflows, sequences, sequence_enrollments, lists, list_memberships, deal_contacts, contact_companies`

---

## The Inbound Lead Funnel (Live Now)

```
Meta Lead Ad / Website Form
           ↓
    inbound-lead webhook (public, no JWT)
           ↓
    Create contact + lead in DB
           ↓
    [INSTANT] Send prospect SMS + email (send-instant-reply webhook)
           ↓
    [INSTANT] Send Greg alert SMS (inbound-lead v70)
           ↓
    [INSTANT] Create 2 notifications (alert + draft reply for Greg)
           ↓
    [INSTANT] Enrol in nurture if timeline > 3 months
           ↓
    [~5min] process-workflows cron runs other automations
```

**Key detail:** Greg gets SMS alert within seconds + in-app notifications for every new seller lead.

---

## What's Next (Priority Order)

### 🔴 **BLOCKING (do before scaling spend)**

1. **Verify email delivery (ONE step)**
   - Check Supabase Dashboard → Edge Functions → Secrets: is `EMAIL_FROM` set to a **verified Resend domain**?
   - If using `onboarding@resend.dev`, prospects won't receive emails (fallback only reaches account owner)
   - Add a real domain to Resend and set `EMAIL_FROM` to it
   - **Test:** Create a lead, check if email ack lands in real inbox
   - **Without this:** Email acks won't reach prospects

2. **Reconcile RLS migrations (cleanup)**
   - Two RLS migrations exist with different policy styles (`auth.uid()` vs `authenticated`)
   - Both target the same 9 tables; one needs to be removed or consolidated
   - Don't disable RLS (prod is already secure), just clean up the migration history
   - File: `supabase/migrations/20260716083118_enable_rls_on_protected_tables.sql` (the auth.uid version) — either remove this or the competing one

3. **Consolidate the two GitHub repos**
   - **Background:** You have two local repos (`~/datadungeon` on office Mac, `~/datadungeon-1` on this one) pointing at different GitHub repos
   - Home Mac has v72 source on branch `leadgen-v72-homemac` in `datadungeonv3-29f00d51`; office Mac is on `datadungeon` (older code)
   - **Action:** 
     - Check Netlify dashboard: which GitHub repo does each site (tiny-brioche CRM, datadungeon-lead-funnel) deploy from?
     - Pick one canonical repo (probably `datadungeon` for the main CRM)
     - Cherry-pick missing v72 code into the canonical repo
     - Repoint the other Mac + the funnel Netlify site to the canonical repo
   - See CORRECTED-STATUS-2026-07-16.md §4 for detailed steps

### 🟡 **HIGH (before scaling spend)**

4. **Privacy Policy Page**
   - Currently just an anchor link `#privacy`
   - Create real page explaining data storage + usage
   - Required for compliant lead capture (GDPR-adjacent for AU)

5. **Consent Wording**
   - SMS + email consent must be **channel-specific** (Australian Spam Act)
   - Add copy to forms: "By submitting, you agree to be contacted via SMS and email. Reply STOP to opt out."
   - Store `sms_consent` / `email_consent` flags in contacts table

6. **Meta Pixel + Lead Event**
   - Add Meta Pixel to landing page
   - Track "Lead" event on form submission
   - (Helps Meta optimize ads toward converters)

7. **Landing Page Polish** (nice-to-have)
   - Add Greg's portrait photo (greg-portrait.jpg in public/assets/)
   - Make hero a 2-column grid: copy left, photo right (desktop); stack on mobile
   - Standardize section spacing (80–96px desktop, 48–56px mobile)
   - Use gold CTAs consistently

### 🟢 **PHASE 2 (after inbound is live + tested)**

8. **Outbound Engine** (ICON replication)
   - See: `HANDOVER-seller-lead-engine.md` §4 for full plan
   - Requires: consent sources for cold outbound (different from inbound)
   - Build: reply-intent classifier → adaptive sequence branching → calendar booking

---

## Key Files & Commands

### Deploy Commands
```bash
npm run supabase:deploy:inbound-lead          # Deploy v70 fix
npm run supabase:deploy:send-instant-reply    # Deploy instant-reply skeleton
npm run db:push                               # Apply RLS migration (or npm run deploy:supabase)
npm run dev                                   # Local dev (http://127.0.0.1:8080)
npm run verify                                # CI gate (vite build + vitest run)
```

### Key Paths
- **App routes:** `src/` (lazy-loaded via React.lazy + Suspense)
- **Edge functions:** `supabase/functions/` (Deno, no JWT verify on inbound-lead)
- **Shared SMS logic:** `supabase/functions/_shared/smsCore.ts` (Mobile Message API)
- **Shared automation:** `supabase/functions/_shared/sellerLeadAutomation.ts` (SMS/email/nurture)
- **Migrations:** `supabase/migrations/` (timestamp_name.sql format)
- **Types:** `src/integrations/supabase/types.ts` (regenerate: `npm run supabase:gen-types`)

### Critical Env Vars (in Supabase Dashboard → Edge Functions → Secrets)
- `INBOUND_WEBHOOK_SECRET` — bearer token for inbound-lead
- `WEBHOOK_SECRET` — bearer token for send-instant-reply (create this)
- `AGENT_ALERT_MOBILE` — Greg's phone (0466805992)
- `MOBILE_MESSAGE_API_USER` — Mobile Message API key user
- `MOBILE_MESSAGE_API_PASSWORD` — Mobile Message API password
- `MOBILE_MESSAGE_SENDER` — SMS sender (currently "Datadungeon"; may need change if delivery issues)
- `BOOKING_LINK` — Optional calendar booking URL

---

## Important Context

### Compliance
- **SMS:** Australian Spam Act requires consent + working unsubscribe ("Reply STOP")
- **Data:** All user-scoped via RLS (user_id = auth.uid())
- **SMS Provider:** Mobile Message AU (reuse of smsCore.ts)
- **Email:** Not yet integrated (skeleton queues but doesn't send)

### Lead Sources
- `facebook-valuation` — Meta lead ads targeting seller appraisals
- `website-valuation` — Pricefinder landing page (planned: `/home-value`)
- `meta_valuation_lp` — Direct webhook tag (for Meta seller automations)
- `inbound_webhook` — Fallback generic source

### Lead Categories
- `seller_lead` — Appraisal enquiry (triggers speed-to-lead automation)
- `active_buyer` — From realestate.com.au etc.
- `warm_lead` — Everything else

### Contact Table Key Fields
- `contact_category` — Routing for automations
- `timeline` — Selling intent ("Ready now", "3-6 months", etc.) — drives nurture enrol
- `sms_consent` / `email_consent` — Add these for compliance
- `communication_preferences` — JSONB for future opt-outs

---

## Testing Checklist

Before scaling Meta spend, verify:

- [ ] Create test contact via inbound-lead webhook → check sms_outbound logs (should show "sent", not "failed")
- [ ] Prospect receives instant SMS ack (currently only if DB webhook is enabled)
- [ ] Prospect receives welcome email (currently "queued" but not sent until email provider is wired)
- [ ] Greg receives alert SMS within 5 seconds
- [ ] Greg sees 2 notifications: alert + draft reply
- [ ] Draft reply shows prospect auto-ack message (editable, one-tap send)
- [ ] Nurture enrol happens for timeline > 3 months
- [ ] RLS works: Greg can only see his own contacts (test with multiple users)

---

## Known Issues / Debt

1. **Email delivery domain:** Email ack uses Resend but needs a **verified custom domain**. Currently falls back to `onboarding@resend.dev` which only reaches the account owner — real prospects won't get emails. Add a real domain to Resend + set `EMAIL_FROM` env var.
2. **Two GitHub repos:** Source code is scattered — office Mac has older code, home Mac has v72 on branch `leadgen-v72-homemac`. Both Netlify sites depend on their respective repos. Need to consolidate (see "What's Next" §3 above).
3. **RLS migration cleanup:** Two conflicting migration files both target the same 9 tables. Prod is secure, but the migration history needs reconciliation.
4. **Landing page:** Photo slot empty; layout needs polish (2-col hero).
5. **Compliance:** Privacy policy page missing; consent wording not yet in forms.

---

## Git & Deployment Flow

- **Branch:** `feat/lead-gen-seller-funnel`
- **CI:** `.github/workflows/ci.yml` runs `npm run verify` on push/PR (build + tests, ESLint excluded due to legacy debt)
- **Live:** Netlify auto-deploys from `main` → https://tiny-brioche-b979f7.netlify.app
- **Supabase:** Migrations auto-apply; edge functions deployed manually via CLI

---

## Related Docs

- **HANDOVER-landing-page-polish.md** — Photo + layout polish tasks
- **HANDOVER-seller-lead-engine.md** — Full inbound + outbound strategy, ICON replication plan
- **INSTANT_REPLY_DESIGN.md** — Webhook → edge function architecture (detailed)
- **CLAUDE.md** (in repo root) — Architecture, all commands, tech stack

---

## Contact

**Greg:** sunofsep@gmail.com  
**Session notes:** See git commits on `feat/lead-gen-seller-funnel` branch (last: v70 SMS + RLS fixes)

---

**You're caught up. Inbound is live. Next: webhook + email provider.** 🚀
