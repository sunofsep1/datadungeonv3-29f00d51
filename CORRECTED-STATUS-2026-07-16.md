# Corrected Status — 16 July 2026

**This supersedes the outdated parts of `HANDOVER-claude.md`.** Where the two disagree, this document is correct — it reflects what was verified directly against the live Supabase project (`sujyalrzbubvhpkntwja`), not what a local migration/deploy *intended*.

---

## 1. True state of production (what's actually running)

| Item | Reality in prod (verified) | vs. old handover |
|---|---|---|
| `inbound-lead` | **v72** — prospect **SMS ack + EMAIL ack** + Mobile Message status fix | Handover says v70 (SMS only). Prod is one step ahead. |
| Prospect SMS text | "Hi [name], thanks for requesting a property appraisal — it's Greg Leigh from Queensland Sotheby's International Realty… Reply STOP to opt out." | Handover shows the older "thanks for your enquiry" text. |
| Prospect EMAIL ack | Sends via **Resend** from `inbound-lead` (branded QSIR template, logged to `interactions`) | Handover says email "not integrated / queued only". Now integrated. |
| Email provider | **Resend** (existing `RESEND_API_KEY`) | Handover suggests adding SendGrid — not needed. |
| `send-instant-reply` | Deployed but **DORMANT — leave its DB webhook OFF** | Handover lists "enable webhook" as blocking — see §2. |
| RLS | Enabled + policy on the **9 scanner-flagged tables**, verified ON | Handover's table list was different and didn't fully land — see §3. |

Email delivery still depends on `EMAIL_FROM` being a **verified Resend domain** (the `onboarding@resend.dev` fallback only reaches the account owner). That's the one thing to confirm for the email ack to reach real inboxes.

---

## 2. Superseded — do NOT do these from the old handover

1. ❌ **"Enable the DB Webhook for `send-instant-reply`."** We consolidated the instant reply into `inbound-lead` v72. Enabling that webhook would run a **second, competing** instant-reply path with a *different* message and risk double-texting prospects. Leave `send-instant-reply` dormant.
2. ❌ **"Wire email provider (SendGrid) in `send-instant-reply`."** Already handled — email now sends from `inbound-lead` via Resend. No SendGrid.

Everything else in the old handover still stands: privacy policy page, channel-specific consent wording, Meta Pixel + Lead event, landing-page polish (photo + 2-col hero), and the Phase-2 outbound/ICON plan.

---

## 3. RLS — reconcile the two migrations

Two different RLS efforts happened and they target **different tables**:

- **Work-Claude's migration** (`20260716083118_enable_rls_on_protected_tables.sql`) intended: `nurture_sequences, nurture_sequence_enrollments, saved_views, pipelines, pipeline_stages, workflows, deal_contacts, contact_companies` with `auth.uid()` policies — but the scanner-flagged tables were still open when checked, so it did **not** fully land on prod.
- **Applied from the home Mac** (migration `enable_rls_authenticated_on_nine_exposed_tables`, verified ON): `pipelines, pipeline_stages, workflows, sequences, sequence_enrollments, lists, list_memberships, deal_contacts, contact_companies` with `authenticated`-scoped policies.

**Action for work-Claude:** reconcile these so both migration files don't fight (duplicate/overlapping `ENABLE RLS` + differently-named policies on the same tables). Decide one policy style (a single-user app can use either `auth.uid()` or `authenticated` safely) and make the migration history consistent with prod. Prod is currently secured on the 9 flagged tables; don't *disable* anything, just align the files.

---

## 4. The two-repo situation (the root of the confusion)

Your two Macs point at **two different GitHub repos**, and your two live sites deploy from different ones:

| | Home Mac | Office Mac |
|---|---|---|
| Local path | `~/datadungeon` | `~/datadungeon-1` |
| GitHub repo | `sunofsep1/datadungeon**v3-29f00d51**` | `sunofsep1/**datadungeon**` |
| Deploys… | the **funnel/landing page** (`datadungeon-lead-funnel`) | the **main CRM app** (`tiny-brioche…`) — per work-Claude |
| Has v72 source? | Yes (branch `leadgen-v72-homemac`) | No (has older v70-style source) |

Supabase is a **single shared project** for both, so prod is unaffected by any of this.

### Step 0 — confirm the mapping (30 seconds, do this first)
In the **Netlify dashboard**, for each site open **Settings → Build & deploy → Repository**. Write down which GitHub repo each of `tiny-brioche…` and `datadungeon-lead-funnel` is wired to. That's the ground truth.

### Then pick ONE canonical repo and consolidate (do deliberately, not mid-flow)
Recommended: whichever repo your **main CRM app** deploys from becomes the home base (likely `datadungeon`, the office repo). Then:

1. **Make the canonical repo complete** — ensure it contains everything the archived repo has that you still need (the funnel `lead-funnel/` code, the v72 edge-function source). Push any missing pieces into the canonical repo (e.g., cherry-pick the v72 files from the `leadgen-v72-homemac` branch).
2. **Repoint the other Mac** to the canonical repo:
   `git remote set-url origin <canonical repo URL>`, then fetch and align its branch.
3. **Repoint the stranded Netlify site** — if the funnel site was deploying from the archived repo, in Netlify UI change its linked repository to the canonical one (Settings → Build & deploy → Link repository), so auto-deploys keep working. **This is the only step that touches a live deploy — do it carefully.**
4. Verify each site still builds + deploys from the canonical repo, then archive the old repo.

⚠️ Until this is done, remember: **prod is deployed from Supabase (shared) and the two Netlify sites — not from whichever Mac you happen to be on.** Editing source on one Mac doesn't change prod until it's deployed.

---

## 5. One-line summary for both Claudes

> Prod = `inbound-lead` **v72** (SMS + Resend email ack + MM fix) + RLS on the 9 flagged tables. `send-instant-reply` stays **dormant**. Two GitHub repos exist (`datadungeon` ↔ office/CRM, `datadungeonv3-29f00d51` ↔ home/funnel); consolidate onto one deliberately after confirming each Netlify site's linked repo. Home-Mac v72 source is on branch `leadgen-v72-homemac` of `datadungeonv3-29f00d51`.
