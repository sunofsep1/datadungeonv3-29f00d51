# AI Ops rollout guide

This guide covers the new AI Ops workspace (`/ai-ops`), dashboard integration, and authoritative Claude spend reporting.

## 1) What shipped

- Dashboard widget: `ClaudeCommandCenterWidget`
- Dedicated route/page: `/ai-ops`
- Strict action workflow: draft -> confirm -> execute
- AI queue tables:
  - `ai_action_runs`
  - `ai_action_items`
- Spend reporting tables:
  - `ai_usage_events`
  - `ai_usage_daily`
- Edge sync function:
  - `sync-anthropic-usage`

## 2) Deploy sequence

From repo root:

```bash
npm run deploy:all
npx supabase functions deploy sync-anthropic-usage --no-verify-jwt
```

## 3) Required secrets

Set these in Supabase function secrets:

- `ANTHROPIC_API_KEY`
- Optional override: `ANTHROPIC_USAGE_URL`
  - defaults to `https://api.anthropic.com/v1/organizations/usage_report/messages`

## 4) Smoke tests

### App UX

1. Open `/ai-ops`
2. Enter a planner prompt and click `Generate draft`
3. Confirm at least one item
4. Click `Execute confirmed`
5. Verify item statuses transition in the queue

### Spend sync

Invoke the function with service-role bearer auth:

```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://<project-ref>.functions.supabase.co/sync-anthropic-usage" \
  -d '{"start_date":"2026-04-01","end_date":"2026-04-20"}'
```

Expected response:

- `success: true`
- non-zero `inserted_events` and `upserted_daily` when provider returns rows

### DB verification

```sql
select usage_date, model, cost_usd, total_tokens
from public.ai_usage_daily
order by usage_date desc, cost_usd desc
limit 20;
```

## 5) Finance controls (recommended)

- Keep AI Ops in strict confirm mode for all write actions.
- Set a soft spend threshold and review every day:
  - spend today
  - 7d spend trend
  - model mix
- Reconcile weekly:
  - compare `ai_usage_daily` totals against Anthropic billing dashboard.

## 6) Notes

- The claw mascot is original and custom-drawn for DataDungeon.
- Spend metrics shown in UI are based on the synced authoritative daily table.
