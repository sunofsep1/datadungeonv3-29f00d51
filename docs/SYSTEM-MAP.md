# DataDungeon — Full System Map & Audit
*Snapshot: Saturday 25 July 2026, 5pm. Live-verified against Supabase, Resend, Meta, Netlify and local scheduled tasks.*

---

## 1. The estate at a glance

| Layer | What | Where |
|---|---|---|
| CRM app | DataDungeon (React/Vite, ~35 routes) | tiny-brioche-b979f7.netlify.app (Netlify ← `main`) |
| Seller funnel | redlandshomevalue.com.au (static + Netlify fns) | 2nd Netlify site ← `lead-funnel/` |
| News hub | redlandshomevalue.com.au/news — The Redlands Insider ×4 articles | same site |
| Personal site | gregleighproperty.com.au | separate (repo location unknown — not in datadungeon) |
| Database | Supabase `sujyalrzbubvhpkntwja` — ~50+ tables, RLS, single user | 709 contacts · 601 properties · 23 listings |
| Email out | Resend (send-email fn, EMAIL_FROM greg@redlandshomevalue.com.au) | full-access API key (fixed 24 Jul) |
| Email in | Resend Inbound `<anything>@venuachiax.resend.app` → email-inbound-bridge | webhook 4ec9f9e4… |
| SMS | Mobile Message via send-sms (+ scheduled/broadcast/webhook fns) | 71 sends in 30 days |
| Ads | Meta acct 10152522788663319 — "Redlands Seller Leads – Conversions" $30/day | champion image + video Challenger B (live 25 Jul), C draft |
| Newsletter | Resend Audience + Broadcasts — issue #1 drafted; 196-contact CSV ready | 1 subscriber so far (test) |

## 2. Lead acquisition → CRM (the funnel map)

```
Meta ads ($30/day)                    Organic / bio links
  │                                        │
  ▼                                        ▼
redlandshomevalue.com.au  ◄──────  /news (Insider articles, SEO)
  │  appraisal wizard (5 steps)         │ newsletter signup blocks
  ▼                                     ▼
Netlify fn lead-intake            Netlify fn newsletter-subscribe
  │ (+secret, honeypot, ratelimit)      │ (CORS: also gregleighproperty)
  ▼                                     ▼
edge fn inbound-lead              edge fn newsletter-subscribe
  │ seller lead: contact + property     │ CRM contact (tag newsletter)
  │ + instant ack email/SMS             │ + Resend Audience + welcome email
  ▼                                     ▼
     ─────────────  CRM (contacts / properties / tasks)  ─────────────

REA/Domain enquiry email → Outlook rule① → leads@venuachiax.resend.app
Pocket voice note summary ──────────────① → notes@venuachiax.resend.app
                                            │ (Resend Inbound webhook, svix-verified)
                                            ▼
                                   edge fn email-inbound-bridge
                                    ├─ leads@/REA content → buyer-enquiry-inbound
                                    │    → instant buyer ack email+SMS, Greg alert SMS,
                                    │      Buyer card proposals in Note Inbox
                                    └─ notes@/Pocket → injector_notes
                                         → pocket-extract (Sonnet, every 2 min cron)
                                         → proposals → /injector Note Inbox v3
                                         → pocket-apply → contacts/properties/tasks/convos
① = NOT YET REWIRED — Greg action outstanding. Until then these two inputs are dead ends.
```

## 3. Automation engine (server-side, 24/7)

pg_cron (9 jobs, all active):
| Job | Schedule (UTC) | Function |
|---|---|---|
| pocket-extract-sweep | */2 min | pocket-extract — Note Master brain |
| process-workflows-every-5min | */5 min | process-workflows — CRM workflow engine ⚠ returning 401 every run |
| nurture-sequence-runner-hourly | hourly | sequence-runner |
| appointment-reminders-hourly | hourly | appointment-reminders ⚠ frequent 400s |
| nightly-lead-score-recompute | 16:00 (2am AEST) | lead scoring |
| daily-lead-sms-morning | 00:00 (10am AEST) | daily-lead-sms |
| followup-digest-daily | 07:00 (5pm AEST) | followup-digest |
| notification-digest | 21:00 & 07:00 | notification-digest |
| daily-birthday-reminders | 21:00 (7am AEST) | birthday-reminders |

Local Cowork scheduled tasks: gmail-crm-sweep (disabled — replaced by bridge ✓), challenger-b-day1-report (fired late 3:32pm today — app was closed at 9:30), verify-gregleighproperty-domain (done).

## 4. Edge functions — all 36, grouped

**Core pipelines (healthy):** inbound-lead · email-inbound-bridge · buyer-enquiry-inbound · newsletter-subscribe · pocket-extract · pocket-apply · send-email · send-sms · send-broadcast · send-sms-broadcast · process-scheduled-sms · sms-webhook · sequence-runner · listing-stage-automation · nightly-lead-score-recompute · followup-digest · notification-digest · generate-notifications · birthday-reminders · appointment-reminders ⚠ · process-workflows ⚠ · daily-lead-sms
**Integrations:** google-calendar · pricefinder-proxy · perplexity-proxy · news-proxy · agentbox-sync · reapit-sync · clickup-sync · sync-anthropic-usage
**Utility:** privacy · list-due-tasks
**⚠ Audit candidates (likely dead/legacy):** `nerws-api` (typo twin of news-proxy, v27, stale) · `pocket-ai-ingest` + `pocket-inject` (superseded by extract/apply pipeline) · `send-instant-reply` (superseded by buyer-enquiry-inbound) · `comms-test` (test artefact)

## 5. Audit — findings (RED / AMBER / GREEN)

**🔴 RED — losing value right now**
1. **Senders not rewired**: Pocket → notes@ and Outlook → leads@ still not done. The entire inbound bridge is live but receiving nothing real. 5-minute job, biggest ROI in the building.
2. **process-workflows 401 every 5 minutes** since at least yesterday — the CRM workflow engine is effectively DOWN (cron caller's auth vs verify_jwt=true mismatch after redeploy v67/68). Any workflow-driven automations are silently not firing.
3. **Newsletter not sent**: issue #1 + 196-contact import both sitting ready. Every day unsent is a day the list forgets you.

**🟡 AMBER — worth cleaning/watching**
4. appointment-reminders returning 400s hourly — check payload/config.
5. Scheduled Cowork tasks only run when the app is open (today's 9:30 report fired at 3:32pm). Anything time-critical should move server-side (pg_cron), keep Cowork tasks for browser work only.
6. Function graveyard: nerws-api, pocket-ai-ingest, pocket-inject, send-instant-reply, comms-test — delete to reduce confusion/attack surface.
7. Note Inbox backlog: 36 pending proposals across 29 notes (incl. 2 bridge-test notes to dismiss).
8. Meta account authentication (#3858385) — confirm completed or ads stop.
9. Test data cleanup: Bridget Test / Greg Bridgetest notes+proposals; 'newsletter' tag on the "For Real" contact.
10. gregleighproperty.com.au repo untracked — can't version or edit it from here; newsletter embed + "300+ sold" stat updates are manual.

**🟢 GREEN — running well**
Funnel + instant ack loop (lead → ack email/SMS in <1s) · Note Master pipeline v3/v5 · email bridge (verified end-to-end) · newsletter capture pipeline (verified) · news hub live · ads: campaign Active, video Challenger B in review · CI (`npm run verify`) · dedupe layers throughout.

## 6. Where to from here — the menu

**This weekend (compounding wins, minutes each):**
A. Rewire Pocket + Outlook (Greg, 5 min) — turns the bridge on for real.
B. Fix process-workflows auth (Claude: align cron bearer/verify_jwt — same pattern as other cron fns).
C. Import CSV + send Insider issue #1 (Greg, 10 min).
D. Function graveyard cleanup + test-data purge (Claude, with Greg's nod).

**Next 2 weeks (pipeline depth):**
E. Judge ads at $150–200 spend: video B vs champion; promote winner, iterate loser. Ship Challenger C if a third slot is wanted.
F. Move day-1-style ad reporting server-side (pg_cron + send-email) so reports don't depend on the app being open.
G. News link in funnel nav + welcome-email link to /news; sitemap.xml for SEO.
H. Communications Phase 3: bulk send into Comms Hub, retire the old SMS suite.

**Spring campaign (Aug → Nov, the money window):**
I. Issue #2 late Aug ("selling in spring starts now") — schedule research+draft.
J. Off-market corner fed from real CRM listings/buyer briefs each issue.
K. Retarget site visitors + newsletter list with spring listing push (Meta custom audiences).
L. Agentbox/Reapit sync decision — keep, finish, or cut.

---
*Companion docs: HANDOVER-2026-07-25.md (yesterday's close-out), SUPABASE_WORKFLOW.md, CLAUDE.md.*
