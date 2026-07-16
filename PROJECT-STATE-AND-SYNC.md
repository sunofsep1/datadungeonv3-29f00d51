# Project State & Two-Mac Sync — Lead-Gen Funnel

*Updated: 16 July 2026 · For Greg + work-Claude*

## The mental model (read this first)

You have **two Macs**, but the important stuff doesn't live "on a Mac" — it lives in the **cloud**, which both Macs share:

- **Supabase** (`sujyalrzbubvhpkntwja`) — the database, edge functions, RLS. **One shared project.** Both Macs point at it. Whatever's deployed is live for both.
- **GitHub** (`sunofsep1/datadungeonv3-29f00d51`) — the source code of the CRM.
- **Netlify** — the live sites (the CRM app + the `datadungeon-lead-funnel` landing page).

So the **live system is already unified** — leads, automation, RLS all run from the cloud regardless of which Mac you're on. The only thing that differs between the two Macs is the **local source-code checkout**, and **git is how you sync that.**

Each Mac = just a working copy. Make both match by committing + pushing to GitHub, then pulling on the other.

---

## What is LIVE in the cloud right now (shared by both Macs)

| Thing | State |
|---|---|
| Supabase `inbound-lead` | **v72** — instant SMS ack + instant email ack (Resend) + Mobile Message status fix |
| Supabase RLS | Enabled + `authenticated` policy on all 9 tables (migration `enable_rls_authenticated_on_nine_exposed_tables`) |
| Supabase `send-instant-reply` | v1, deployed but **DORMANT — do not enable its DB webhook** (redundant with inbound-lead; source routing doesn't match the live `meta_valuation_lp` funnel) |
| Netlify `datadungeon-lead-funnel` | Live landing page (source lives only on the office Mac — see gap below) |
| Netlify CRM app | Live |

---

## Changelog — this session (deployed to prod from the HOME Mac)

1. **`inbound-lead` v70:** added prospect **SMS** ack for Meta seller leads; fixed the Mobile Message status bug (accept `success/sent/queued/delivered/ok`, not just `sent`).
2. **`inbound-lead` v72:** added prospect **email** ack via **Resend** (reuses existing `RESEND_API_KEY` / `EMAIL_FROM`; logs to `interactions`; fully guarded). `SellerLeadContext` now carries `email`.
3. **RLS migration applied** on the 9 previously-exposed tables (was reported done earlier but hadn't actually landed on this project).

**Email needs:** confirm `RESEND_API_KEY` is set and `EMAIL_FROM` is a **verified Resend domain** (the `onboarding@resend.dev` fallback only delivers to the account owner).

---

## What's NOT yet in git (so NOT on the office Mac yet)

Uncommitted on the **HOME Mac** right now — these match prod v72 and need commit + push:

- `supabase/functions/inbound-lead/index.ts` *(modified — passes `email` to automation)*
- `supabase/functions/_shared/sellerLeadAutomation.ts` *(new file — the whole automation module; was deployed but never committed)*
- Strategy docs: `HANDOVER-seller-lead-engine.md`, `HANDOVER-landing-page-polish.md`, `META-ADS-LAUNCH-KIT.md`, `PRIVACY-POLICY.md`, `landing-hero-v2.html`, `seller-lead-engine.html`, this file.

> Note: the HOME Mac also has other unrelated uncommitted changes (ios/, several `src/` components, `package.json`) and is **1 commit ahead of origin** — those aren't from the lead-gen work; leave them or handle separately so we don't mix concerns.

## What likely lives ONLY on the office Mac (push so the home Mac gets it)

- `send-instant-reply` source (function is deployed, but confirm the source is committed).
- Any RLS migration file work-Claude wrote (the *effect* is now applied to prod via the home-Mac migration; reconcile the migration files so they don't conflict).
- ⚠️ **The `datadungeon-lead-funnel` landing-page project** — this appears to be a **separate project that only exists on the office Mac**. It's live on Netlify but if its source isn't in its own pushed git repo, it exists in exactly one place. **Recommend:** put it in its own GitHub repo and push it, so it's backed up and on both Macs.

---

## Sync plan (do this once to get both Macs matching)

1. **HOME Mac:** commit the lead-gen files above (`git add` them specifically), then `git pull --rebase` and `git push`.
2. **Office Mac:** commit `send-instant-reply` + any migration files, `git pull --rebase` (to get the home Mac's commit), resolve any overlap, `git push`.
3. Both Macs then `git pull` → checkouts match.
4. Push the **landing-page project** to its own repo so it's not stranded on one Mac.
5. Treat **Supabase = runtime truth** and **GitHub = source truth** from here. Deploy functions from a committed state so prod and git never drift again.

## For work-Claude specifically

- Pull to get `inbound-lead` **v72** source + `sellerLeadAutomation.ts`. **Don't redeploy an older `inbound-lead`** or you'll revert the email ack + the SMS fix.
- **Don't enable the `send-instant-reply` DB webhook** — we consolidated on inbound-lead.
- Confirm `RESEND_API_KEY` + a verified `EMAIL_FROM` domain so the email ack actually delivers.
