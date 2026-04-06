# CRM deploy & verify checklist

Tight pass after schema, Edge, or cron changes. Tick boxes as you go; adjust names if your project differs.

**One-shot Supabase deploy (from repo root, CLI logged in + project linked):**

```bash
npm run deploy:all
```

Runs **`npm run verify`** (build + Vitest), then **`supabase db push --linked --yes`** and **`supabase functions deploy --use-api`** (all functions, no local Docker). Frontend is **not** included — publish the Vite app via Lovable, Vercel, Netlify, or your CI (see README §7).

## Frontend (local, before merge)

- [ ] **`npm run verify`** — production **`vite` build** plus **`vitest run`** (all unit tests once). This is the regression gate that should stay green; run it after meaningful UI or data-hook changes.
- [ ] **`npm run verify:lint`** (optional until ESLint debt is cleared) — full-repo **`eslint .`**. The tree still has legacy violations in some pages and Edge sources; tighten lint when you touch those areas or in a dedicated cleanup pass.

## 1. Database

- [ ] Latest migrations applied (Dashboard → SQL or `npx supabase db push` against the **correct** project).
- [ ] **Workflow step audit (`20260405180000`):** table `crm_workflow_step_runs` exists; RLS allows `SELECT` for `user_id = auth.uid()`; `process-workflows` redeployed so inserts run after each step.
- [ ] **Workflows / scripts (e.g. `20260404210000`):** `crm_workflow_steps` has branching columns; trigger types include `listing_stage_change` / `deal_stage_change` as expected; script library table + **8** seeded rows; `seed_scripts_from_library()` exists and is granted appropriately.
- [ ] Spot-check in SQL (optional):

```sql
-- templates count (expect 8 after seed migration)
select count(*) from public.script_templates;

-- RPC present
select proname from pg_proc where proname = 'seed_scripts_from_library';
```

## 2. Edge Functions

- [ ] **`process-workflows`** redeployed after code changes; bundle includes shared code (e.g. `_shared/smsCore.ts`).
- [ ] **`send-email`** redeployed if timeline logging or payload handling changed.
- [ ] Invoke smoke test (Dashboard → Edge Functions → logs, or `curl` with anon/service key per your setup).

**Typical CLI (from repo root, logged in):**

```bash
npx supabase functions deploy process-workflows
npx supabase functions deploy send-email
```

## 3. Cron & secrets

- [ ] pg_cron job for **`process-workflows`** scheduled (e.g. every 5 minutes). See `supabase/migrations/20260404000003_backend_automation_cron_schedules.sql` and `supabase/RUN_IN_SUPABASE_DASHBOARD_process_workflows_cron.sql`.
- [ ] Vault / secrets: project URL + **service role** for `net.http_post`; no stray **temp** tokens left in env or docs.

## 4. App — Scripts

- [ ] Open **`/scripts`**.
- [ ] **Add starter scripts** → eight templates appear; open one and confirm content loads.
- [ ] If RPC is idempotent, second click should not duplicate chaos (confirm expected behavior).

## 5. App — Listing stage → workflow

- [ ] In **Automations**, create (or confirm) a workflow with **`trigger_type`: `listing_stage_change`** (and correct object / `trigger_conditions` for your pipeline stage).
- [ ] On **`/listings`**, move a listing’s **pipeline stage** across the boundary you configured.
- [ ] Within a cron cycle (≤ ~5 min), confirm **enrollment** and/or **step execution** in DB or function logs.

## 6. App — Email → interactions timeline

- [ ] Send path that includes **`contact_id`** (e.g. workflow step with email + contact context).
- [ ] On the **contact** record, confirm a new **interaction** / timeline row tied to that send.

## 7. Optional — `if_branch` & real sends

- [ ] Workflow with **`if_branch`** step: both branches behave as configured.
- [ ] Step with **`execute_send: true`**: SMS/email only when provider secrets (Mobile Message, Resend, etc.) are set; confirm logs on failure/success.

---

**Related:** [frontend-upgrade.md](./frontend-upgrade.md) (IA, routes, notifications); [upgrade-status.md](./upgrade-status.md) (briefing vs current stack). Update this checklist when you add new triggers or functions.
