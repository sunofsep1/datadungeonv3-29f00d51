# DATADUNGEON HANDOVER — Tue 4 Aug 2026 — full day wrap
*From: work Claude. For: home Claude. Covers the 3–4 Aug session (newsletter #2, Elysium vendor report, CRM cleanup, register-interest, Outlook integration). Project memory files updated in parallel — this is the narrative + action list.*

## 1. NEWSLETTER ISSUE #2 — built, committed locally, NOT pushed/sent
- Issue #1 send CONFIRMED (26 Jul 5:36pm All Contacts, 233 delivered / 20 bounced / 11 unsub; 29 Jul catch-up to 24 via General segment) — resolves the 3 Aug brief's open question.
- Issue #2 complete: `newsletter/issue-02.html` (spring theme; 4 teaser cards; refreshed market pulse with SALE medians + RBA 4.35%/11 Aug hook; **off-market corner = 9 Wilohurst Drive, Redland Bay** (coming soon, spring auction); **36-tips guide download band**). Subject PICKED: "Thornlands townhouses just jumped 17%. Here's what else moved." (`issue-02-subject.txt` in /tmp build — NOT yet in repo; body + subject live in the chat session too).
- 4 article pages + updated index in repo `lead-funnel/news/` (spring-selling-starts-now, thornlands-townhouses-2026, city-plan-update-2026, birkdale-whitewater-2026). Facts current & sourced (City Plan → Minister 16 Jul; whitewater "not controlled action" 28 May, CARP challenge; Thornlands units ~$762.5k +17.3% YIP).
- Gated 36-tips form on the spring article posts to existing `newsletter-subscribe` fn (email ungated, site gated).
- STILL NEEDED before send: (a) Greg's funnel push (see §6), (b) verify /news + guide PDF live, (c) **Tyson's Pullenvale featured-listing details** (Greg wants a featured-listing band added — no details supplied yet; placement suggested under intro), (d) Resend: sync new CRM contacts to audience **EXCLUDING the 238 ⚠️ id4me (unverified) contacts**, duplicate broadcast, To=All Contacts, test-send to Greg, send. Target was ~Wed 5 Aug.

## 2. 17 ELYSIUM RD — Week 4 vendor report DONE
- Status per Greg: Tommy Govan SIGNED contract $1,000,000, counter in play. Sat 2 Aug open: 3 groups, no new offers.
- Delivered + in repo root: `17_Elysium_Road_Vendor_Report_Week4.docx/.pdf` (detailed), `17_Elysium_Road_Vendor_Report_Week4_Summary.docx/.pdf` (1-page bullets — Greg's preferred), `17-elysium-vendor-report-week4-email.html` (full report as styled email body). Buyer feedback table: Govan $1M, rest very low $900s (labelled indicative agent estimates). Recommendation = secure Govan, measured counter.
- Combined W4 numbers: ~78k impressions / 4,202 views / 74 enq / 167 saves. Send to p.m.mcdermott@bigpond.com cc Jan + Michelle West — Greg sends himself (not yet confirmed sent).

## 3. CRM CLEANUP + id4me
- Dedupe runs: 895→865→(Helen pair, Kripak)→~912. Backups `*_bak_20260803` + `b` variants, RLS on. 4 ambiguous name-dups STILL HELD (Beren Matthews, Helen harry-vs-bettina, Lloyd Jones, Shona Adams). Joyces = couple, not dups.
- Untagged 118→2 via property-link owner tagging (👤 Owner now ~406).
- **⚠️ id4me (unverified)** tag (red) on **238 contacts** (created ≥26 Jul, blank source) — scraped data, do NOT bulk-email; exclude from any Resend sync.
- 13/47 Freshwater St Thornlands added (townhouse, est $780k, investment) + Kripaks enriched (NSW address, Investor/Owner/Thornlands tags) + CMA/pamper-pack task due Fri 7 Aug + hero image (URL → funnel assets, live after push).

## 4. REGISTER-INTEREST CAPTURE (gregleighproperty listings)
- `lead-funnel/netlify/functions/register-interest.js` in repo (unpushed): creates CRM buyer via inbound-lead (source website_register_interest) + instant Resend email to Greg (reply-to buyer). Needs `RESEND_API_KEY` env on FUNNEL Netlify site.
- Paste-in embed (name/last/mobile/email/suburb/postcode, data-listing="9 Wilohurst Drive, Redland Bay") delivered to Greg — goes into the SEPARATE gregleighproperty.com.au Netlify site (not in this repo).

## 5. OUTLOOK/MICROSOFT CALENDAR INTEGRATION — deployed, blocked on admin consent
- `microsoft-calendar` edge fn LIVE (v1, verify_jwt=false, mirrors google-calendar; source in repo `supabase/functions/microsoft-calendar/`). Redirect URI (registered): `https://sujyalrzbubvhpkntwja.supabase.co/functions/v1/microsoft-calendar/callback`.
- Nick (RBC, ticket T20260801.0060) repointed old Entra app: **client 3d7ece31-5ad9-4432-92e1-5f38c6c52853, tenant 622df580-789a-48c0-b863-2ada9fcbada9**, secret via ITGlue (expires 31 Jan 2027 — renewal task in CRM due 15 Jan 2027). Greg LOADED MS_CLIENT_ID / MS_CLIENT_SECRET / MS_TENANT_ID into Supabase edge-fn secrets 4 Aug.
- offline_access: Nick added it (14:28 email). Two sign-in attempts (via Chrome automation) hit **AADSTS90095 admin-consent-required**. Approval request SUBMITTED (in Nick's Entra queue, expires 3 Sep) + reply sent on ticket pointing him to App registrations → API permissions → "Grant admin consent for qldsir.com".
- NEXT: when Nick confirms consent → mint fresh `oauth_states` row for Greg's user via SQL (10-min expiry) → authorize URL (template in memory `project_outlook_integration.md`) → Greg signs in → verify ms_access_token in auth user_metadata / events action. CRM task "Chase Nick" due Wed 5 Aug 2pm. Frontend "Connect Outlook" UI = later (tiny-brioche deploy lock).
- Note: an old `upload-property-image` fn was deployed then neutralised (returns 410) — safe to delete from dashboard.

## 6. GIT / DEPLOY STATE (the one push that matters)
- Repo on `weekview`; **weekview == origin/main exactly**; local `main` is stale (25 behind) — this repo ships via `git push origin weekview:main`.
- Uncommitted: all of §1/§3-hero/§4 funnel files + microsoft-calendar source + a migration. Commands given to Greg:
  `git add lead-funnel supabase/functions/microsoft-calendar supabase/migrations && git commit -m "Issue #2 news + guide + register-interest + Freshwater hero + microsoft-calendar" && git push origin weekview:main`
- After push VERIFY: redlandshomevalue.com.au/news (Issue #2 cards), /assets/greg-36-tips-selling-your-home.pdf, /assets/13-47-freshwater-hero.jpg, /.netlify/functions/register-interest (405 on GET = good).

## Open items, ranked
1. Greg: push (§6) → verify 4 URLs.
2. Tyson Pullenvale featured-listing details → add band to issue-02.html → newsletter send flow (§1d).
3. Nick admin consent → finish Outlook connect (§5).
4. RESEND_API_KEY on funnel Netlify + paste register-interest embed into gregleighproperty site.
5. Greg to send Elysium W4 report to Peter (materials ready).
6. Held: 4 ambiguous contact dups; suburb backfill for location tags; Resend audience sync (minus id4me).
— work Claude, 4 Aug 2026
